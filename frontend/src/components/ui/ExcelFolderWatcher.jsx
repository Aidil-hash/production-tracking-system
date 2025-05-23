import React, { useState, useEffect, useRef } from 'react';
import { Button, Typography, Box, LinearProgress, List, ListItem, ListItemText, IconButton, Paper, Alert, CircularProgress } from '@mui/material';
import * as XLSX from 'xlsx';

const ExcelFolderWatcher = ({ lineId, authToken, onBatchProcessed }) => {
  const [folderHandle, setFolderHandle] = useState(null);
  const [processedFiles, setProcessedFiles] = useState([]);
  const [isWatching, setIsWatching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [processedSerialNumbers, setProcessedSerialNumbers] = useState([]);
  const knownFiles = useRef(new Set());
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const requestFolderAccess = async () => {
    try {
      setError(null);
      const handle = await window.showDirectoryPicker();
      setFolderHandle(handle);
      setSuccess(`Watching folder: ${handle.name}`);
      knownFiles.current = new Set(); // Reset known files when folder changes
    } catch (err) {
      setError('Folder access was denied or cancelled');
      console.error("Folder access error:", err);
    }
  };

  const processFile = async (fileHandle) => {
    try {
      const file = await fileHandle.getFile();
      
      // Check if file is still being written (size changes)
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      const size1 = file.size;
      await new Promise(resolve => setTimeout(resolve, 1000));
      const size2 = (await fileHandle.getFile()).size;
      
      if (size1 !== size2) {
        throw new Error('File is still being written');
      }

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const serials = [];
      const errors = [];

      jsonData.forEach((item, index) => {
        try {
          const serialNumber = item.serialNumber || item['Serial Number'] || item.SERIAL;
          const testStatus = (item.testStatus || item.Status || 'UNKNOWN').toUpperCase();

          if (!serialNumber) {
            throw new Error('Missing serial number');
          }

          if (!['PASS', 'NG'].includes(testStatus)) {
            throw new Error(`Invalid status: ${testStatus}`);
          }

          serials.push({
            serialNumber: String(serialNumber).trim(),
            status: testStatus,
            row: index + 2 // +2 because header is row 1 and sheets are 1-indexed
          });
        } catch (err) {
          errors.push({
            row: index + 2,
            error: err.message,
            data: item
          });
        }
      });

      return {
        fileName: file.name,
        success: true,
        serials,
        errors
      };
    } catch (err) {
      console.error(`Error processing ${fileHandle.name}:`, err);
      return {
        fileName: fileHandle.name,
        success: false,
        error: err.message
      };
    }
  };

  const checkForNewFiles = async () => {
    if (!folderHandle || !isWatching || isProcessing) return;

    try {
      const newFiles = [];
      for await (const entry of folderHandle.values()) {
        if (
          entry.kind === 'file' &&
          entry.name.match(/\.(xlsx|xls|csv)$/i) &&
          !knownFiles.current.has(entry.name)
        ) {
          newFiles.push(entry);
        }
      }

      if (newFiles.length > 0) {
        setIsProcessing(true);
        setProgress(0);

        const results = [];
        for (let i = 0; i < newFiles.length; i++) {
          try {
            const file = newFiles[i];
            knownFiles.current.add(file.name); // Mark as known immediately

            const result = await processFile(file);
            results.push(result);

            // Collect all serial numbers
            if (result.success) {
              setProcessedSerialNumbers(prev => [
                ...prev,
                ...result.serials.map(s => ({
                  serialNumber: s.serialNumber,
                  status: s.status,
                  sourceFile: file.name
                }))
              ]);
            }

            setProgress(((i + 1) / newFiles.length) * 100);
          } catch (fileErr) {
            console.error(`Error processing file ${newFiles[i]?.name}:`, fileErr);
            results.push({
              fileName: newFiles[i]?.name || 'Unknown file',
              success: false,
              error: fileErr.message
            });
          }
        }

        setProcessedFiles(prev => [...prev, ...results]);
        setSuccess(`Processed ${newFiles.length} new file(s)`);
        setIsProcessing(false);
      }
    } catch (err) {
      setError(`Error checking folder: ${err.message}`);
      console.error("Folder check error:", err);
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!folderHandle || !isWatching) return;

    const intervalId = setInterval(checkForNewFiles, 5000); // Check every 5 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [folderHandle, isWatching]);

  const handleSubmit = async () => {
    if (processedSerialNumbers.length === 0) {
      setError('No serial numbers to submit.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setSuccess(null);

      const batchPayload = {
        serialNumbers: processedSerialNumbers.map(sn => ({
          serialNumber: sn.serialNumber,
          serialStatus: sn.status
        }))
      };

      const response = await fetch(`${API_URL}/api/lines/${lineId}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(batchPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          `Server responded with ${response.status}: ${response.statusText}`
        );
      }

      const responseData = await response.json();
      setSuccess(`Successfully submitted ${batchPayload.serialNumbers.length} serials`);
      setProcessedSerialNumbers([]);
      
      // Notify parent component with consistent array format
      if (onBatchProcessed) {
        onBatchProcessed([{
          success: true,
          count: batchPayload.serialNumbers.length,
          data: batchPayload.serialNumbers.map(sn => ({ 
            serialNumber: sn.serialNumber, 
            success: true 
          }))
        }]);
      }
    } catch (err) {
      setError(err.message || 'Batch submission failed');
      console.error('Batch submission error:', err);
    } finally {
      setIsProcessing(false);
    }
  };


  const resetAll = () => {
    setFolderHandle(null);
    setProcessedFiles([]);
    setIsWatching(false);
    setError(null);
    setSuccess(null);
    setProcessedSerialNumbers([]);
    knownFiles.current = new Set();
  };

  return (
    <Box sx={{ p: 3, border: '1px solid #ccc', borderRadius: 2, maxWidth: 800, margin: '0 auto' }}>
      <Typography variant="h6" gutterBottom>
        Excel Batch Upload
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {!folderHandle ? (
          <Button variant="contained" onClick={requestFolderAccess}>
            Select Folder
          </Button>
        ) : (
          <>
            <Typography sx={{ flexGrow: 1, alignSelf: 'center' }}>
              Watching: <strong>{folderHandle.name}</strong>
            </Typography>
            <Button variant="outlined" color="error" onClick={resetAll}>
              Reset
            </Button>
          </>
        )}
      </Box>

      {folderHandle && (
        <Button
          variant="contained"
          color={isWatching ? 'error' : 'primary'}
          onClick={() => setIsWatching(!isWatching)}
          disabled={isProcessing}
          sx={{ mb: 3 }}
          fullWidth
        >
          {isWatching ? 'Stop Watching' : 'Start Watching'}
        </Button>
      )}

      {isProcessing && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="body2" align="center" sx={{ mt: 1 }}>
            Processing... {Math.round(progress)}%
          </Typography>
        </Box>
      )}

      <Paper elevation={3} sx={{ p: 2, mb: 3, maxHeight: 200, overflow: 'auto' }}>
        <Typography variant="subtitle1" gutterBottom>
          Processed Files ({processedFiles.length})
        </Typography>
        <List dense>
          {processedFiles.map((file, index) => (
            <ListItem key={index} divider>
              <ListItemText
                primary={file.fileName}
                secondary={
                  file.success ? 
                    `${file.serials?.length || 0} serials found` : 
                    `Error: ${file.error}`
                }
                sx={{ color: file.success ? 'inherit' : 'error.main' }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Paper elevation={3} sx={{ p: 2, mb: 3, maxHeight: 300, overflow: 'auto' }}>
        <Typography variant="subtitle1" gutterBottom>
          Ready to Submit ({processedSerialNumbers.length} serials)
        </Typography>
        <List dense>
          {processedSerialNumbers.slice(0, 10).map((sn, index) => (
            <ListItem key={index} divider>
              <ListItemText
                primary={sn.serialNumber}
                secondary={`Status: ${sn.status} (from ${sn.sourceFile})`}
              />
            </ListItem>
          ))}
          {processedSerialNumbers.length > 10 && (
            <ListItem>
              <ListItemText
                primary={`...and ${processedSerialNumbers.length - 10} more`}
              />
            </ListItem>
          )}
        </List>
      </Paper>

      <Button
        variant="contained"
        color="success"
        onClick={handleSubmit}
        disabled={processedSerialNumbers.length === 0 || isProcessing}
        fullWidth
        size="large"
      >
        {isProcessing ? 'Submitting...' : 'Submit Serial Numbers'}
      </Button>
    </Box>
  );
};

export default ExcelFolderWatcher;