import React, { useState, useEffect, useRef } from 'react';
import { 
  Button, Typography, Box, LinearProgress, List, ListItem, 
  ListItemText, Paper, Alert
} from '@mui/material';
import * as XLSX from 'xlsx';

const ExcelFolderWatcher = ({ modelName, lineId, authToken, onBatchProcessed }) => {
  const [folderHandle, setFolderHandle] = useState(null);
  const [processedFiles, setProcessedFiles] = useState([]);
  const [isWatching, setIsWatching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [unprocessedSerials, setUnprocessedSerials] = useState([]);
  const fileCache = useRef(new Map());
  const currentDateRef = useRef('');
  const processedSerialsCache = useRef(new Set());
  const scanInterval = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const updateTodaysDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    currentDateRef.current = `${year}${month}${day}`;
    return currentDateRef.current;
  };

  const requestFolderAccess = async () => {
    try {
      setError(null);
      updateTodaysDate();
      const handle = await window.showDirectoryPicker();
      setFolderHandle(handle);
      setSuccess(`Watching folder: ${handle.name}`);
      fileCache.current = new Map();
      processedSerialsCache.current = new Set();
      setProcessedFiles([]);
      setUnprocessedSerials([]);
    } catch (err) {
      setError('Folder access was denied or cancelled');
      console.error("Folder access error:", err);
    }
  };

  const isTodaysFile = (filename) => {
    const datePattern = new RegExp(`_${currentDateRef.current}_`);
    return datePattern.test(filename);
  };

  const processFile = async (fileHandle) => {
    try {
      const file = await fileHandle.getFile();
      
      if (!isTodaysFile(file.name)) {
        return {
          fileName: file.name,
          skipped: true,
          reason: 'Not today\'s file'
        };
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      const size1 = file.size;
      await new Promise(resolve => setTimeout(resolve, 1000));
      const size2 = (await fileHandle.getFile()).size;
      
      if (size1 !== size2) {
        throw new Error('File is still being written');
      }

      const fileKey = `${file.name}-${file.lastModified}-${size2}`;
      if (fileCache.current.has(fileKey)) {
        return { 
          fileName: file.name,
          skipped: true,
          reason: 'File already processed'
        };
      }

      const data = await file.arrayBuffer();
      let jsonData = [];
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        // Custom CSV parsing for this specific format
        const text = new TextDecoder().decode(data);
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length > 0) {
          const headers = lines[0].split(',');
          
          jsonData = lines.slice(1).map(line => {
            // Handle quoted fields that might contain commas
            const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const obj = {};
            headers.forEach((header, i) => {
              obj[header.trim()] = values[i] ? values[i].trim().replace(/^"|"$/g, '') : '';
            });
            return obj;
          });
        }
      } else {
        // Process Excel file
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonData = XLSX.utils.sheet_to_json(worksheet);
      }

      const newSerials = [];
      const errors = [];

      jsonData.forEach((item, index) => {
        try {
          // Get raw serial from InputText column (specific to this CSV format)
          let rawSerial = item.InputText || '';
          
          // Clean the serial number - remove quotes and trailing comma
          const serialNumber = rawSerial
            .replace(/^"+|"+$/g, '')  // Remove surrounding quotes
            .replace(/,$/, '')        // Remove trailing comma
            .trim();

          if (!serialNumber) {
            throw new Error('Missing serial number in InputText column');
          }

          // Get test status from Result column
          let testStatus = (item.Result || '').toUpperCase();
          
          // Convert "FAIL:xx" to "NG" and "PASS" to "PASS"
          if (testStatus.includes('FAIL')) {
            testStatus = 'NG';
          } else if (testStatus.includes('PASS')) {
            testStatus = 'PASS';
          } else {
            throw new Error(`Invalid test status: ${testStatus}`);
          }

          if (!processedSerialsCache.current.has(serialNumber)) {
            newSerials.push({
              serialNumber,
              status: testStatus,
              sourceFile: file.name,
              row: index + 2
            });
          }
        } catch (err) {
          errors.push({
            row: index + 2,
            error: err.message,
            data: item
          });
        }
      });

      fileCache.current.set(fileKey, true);
      return {
        fileName: file.name,
        success: true,
        serials: newSerials,
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

  const scanAllFiles = async () => {
    if (!folderHandle || isProcessing) return;

    try {
      setIsProcessing(true);
      setProgress(0);
      setError(null);

      const newDate = updateTodaysDate();
      if (newDate !== currentDateRef.current) {
        fileCache.current = new Map();
        processedSerialsCache.current = new Set();
        setProcessedFiles([]);
        setUnprocessedSerials([]);
      }

      const allFiles = [];
      for await (const entry of folderHandle.values()) {
        if (
          entry.kind === 'file' && 
          entry.name.match(/\.(xlsx|xls|csv)$/i) &&
          isTodaysFile(entry.name)
        ) {
          allFiles.push(entry);
        }
      }

      const results = [];
      const newUnprocessedSerials = [];

      for (let i = 0; i < allFiles.length; i++) {
        const result = await processFile(allFiles[i]);
        results.push(result);

        if (result.success && result.serials) {
          newUnprocessedSerials.push(...result.serials);
        }

        setProgress(((i + 1) / allFiles.length) * 100);
      }

      setProcessedFiles(prev => [
        ...prev.filter(f => isTodaysFile(f.fileName)),
        ...results.filter(r => !r.skipped)
      ]);
      
      if (newUnprocessedSerials.length > 0) {
        const updatedSerials = [...unprocessedSerials, ...newUnprocessedSerials];
        setUnprocessedSerials(updatedSerials);
        setSuccess(`Found ${newUnprocessedSerials.length} new serials`);

        // Auto-submit after updating state
        setTimeout(() => {
          handleSubmit();
        }, 1000);

        if (scanInterval.current) {
          clearInterval(scanInterval.current);
          scanInterval.current = null;
        }
      } else {
        setSuccess('No new serials found');
      }
    } catch (err) {
      setError(`Error scanning files: ${err.message}`);
      console.error("Scan error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!folderHandle || !isWatching || unprocessedSerials.length > 0) return;

    // Start scanning only when there's no unprocessed serials
    scanInterval.current = setInterval(scanAllFiles, 10000);
    scanAllFiles(); // Initial scan

    return () => {
      if (scanInterval.current) {
        clearInterval(scanInterval.current);
        scanInterval.current = null;
      }
    };
  }, [folderHandle, isWatching, unprocessedSerials.length]);

  const handleSubmit = async () => {
    if (unprocessedSerials.length === 0) {
      setError('No unprocessed serial numbers to submit.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setSuccess(null);

      const batchPayload = {
        serialNumbers: unprocessedSerials.map(sn => ({
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
      
      unprocessedSerials.forEach(sn => {
        processedSerialsCache.current.add(sn.serialNumber);
      });
      setUnprocessedSerials([]);
      
      if (onBatchProcessed) {
        onBatchProcessed({
          success: true,
          count: batchPayload.serialNumbers.length
        });
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
    setUnprocessedSerials([]);
    fileCache.current = new Map();
    processedSerialsCache.current = new Set();
    if (scanInterval.current) {
      clearInterval(scanInterval.current);
      scanInterval.current = null;
    }
  };

  return (
    <Box sx={{ p: 3, border: '1px solid #ccc', borderRadius: 2, maxWidth: 800, margin: '0 auto' }}>
      <Typography variant="h6" gutterBottom>
        Excel Batch Upload (Smart Scan)
      </Typography>
      <Typography variant="subtitle2" className='text.white' gutterBottom>
        {`Scanning for files with date: ${currentDateRef.current}`}
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
              {isWatching ? `Watching: ${folderHandle.name}` : `Selected: ${folderHandle.name}`}
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
          fullWidth
          sx={{ mb: 3 }}
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
                  file.skipped ? file.reason :
                  file.success ? 
                    `${file.serials?.length || 0} serials found` : 
                    `Error: ${file.error}`
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Paper elevation={3} sx={{ p: 2, mb: 3, maxHeight: 300, overflow: 'auto' }}>
        <Typography variant="subtitle1" gutterBottom>
          Ready to Submit ({unprocessedSerials.length} serials)
        </Typography>
        <List dense>
          {unprocessedSerials.slice(0, 10).map((sn, index) => (
            <ListItem key={index} divider>
              <ListItemText
                primary={sn.serialNumber}
                secondary={`Status: ${sn.status} (from ${sn.sourceFile})`}
              />
            </ListItem>
          ))}
          {unprocessedSerials.length > 10 && (
            <ListItem>
              <ListItemText
                primary={`...and ${unprocessedSerials.length - 10} more`}
              />
            </ListItem>
          )}
        </List>
      </Paper>

      <Button
        variant="contained"
        color="success"
        onClick={handleSubmit}
        disabled={unprocessedSerials.length === 0 || isProcessing}
        fullWidth
        size="large"
      >
        {isProcessing ? 'Submitting...' : 'Submit Unprocessed Serials'}
      </Button>
    </Box>
  );
};

export default ExcelFolderWatcher;