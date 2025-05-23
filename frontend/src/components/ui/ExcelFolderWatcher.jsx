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
  const [processedSerialNumbers, setProcessedSerialNumbers] = useState([]);
  const [fullRescanMode, setFullRescanMode] = useState(false);
  const fileCache = useRef(new Map());

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const requestFolderAccess = async () => {
    try {
      setError(null);
      const handle = await window.showDirectoryPicker();
      setFolderHandle(handle);
      setSuccess(`Watching folder: ${handle.name}`);
      fileCache.current = new Map();
    } catch (err) {
      setError('Folder access was denied or cancelled');
      console.error("Folder access error:", err);
    }
  };

  const cleanSerialNumber = (serial) => {
    return String(serial)
      .trim()
      .replace(/,$/, '') // Remove trailing comma
      .replace(/^"+|"+$/g, '') // Remove surrounding quotes
      .replace(/\s+/g, ''); // Remove all whitespace
  };

  const processFile = async (fileHandle) => {
    try {
      const file = await fileHandle.getFile();
      
      // Check if file is still being written
      await new Promise(resolve => setTimeout(resolve, 1000));
      const size1 = file.size;
      await new Promise(resolve => setTimeout(resolve, 1000));
      const size2 = (await fileHandle.getFile()).size;
      
      if (size1 !== size2) {
        throw new Error('File is still being written');
      }

      const data = await file.arrayBuffer();
      let jsonData;
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        // Correct CSV processing using sheet_to_json
        const csvString = new TextDecoder().decode(data);
        const workbook = XLSX.read(csvString, { type: 'string' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonData = XLSX.utils.sheet_to_json(worksheet);
      } else {
        // Standard Excel processing
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonData = XLSX.utils.sheet_to_json(worksheet);
      }

      const serials = [];
      const errors = [];

      jsonData.forEach((item, index) => {
        try {
          const rawSerial = item.serialNumber || item['Serial Number'] || item.SERIAL || item['serial'] || item['Serial'] || item['InputText'];
          let rawStatus = item.testStatus || item.Status || item.status|| item['Result'] || 'UNKNOWN';

          if (!rawSerial) {
            throw new Error('Missing serial number');
          }

          const serialNumber = cleanSerialNumber(rawSerial);
          
          // Convert any FAIL* to NG
          let status = rawStatus.toUpperCase().startsWith('FAIL') ? 'NG' : rawStatus.toUpperCase();

          if (!['PASS', 'NG'].includes(status)) {
            throw new Error(`Invalid status: ${rawStatus}`);
          }

          serials.push({
            serialNumber,
            status,
            row: index + 2
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

  const scanAllFiles = async () => {
    if (!folderHandle || isProcessing) return;

    try {
      setIsProcessing(true);
      setProgress(0);
      setError(null);

      const allFiles = [];
      for await (const entry of folderHandle.values()) {
        if (entry.kind === 'file' && entry.name.match(/\.(xlsx|xls|csv)$/i)) {
          allFiles.push(entry);
        }
      }

      const results = [];
      const newSerials = [];

      for (let i = 0; i < allFiles.length; i++) {
        const result = await processFile(allFiles[i]);
        results.push(result);

        if (result.success && result.serials) {
          newSerials.push(...result.serials.map(s => ({
            serialNumber: s.serialNumber,
            status: s.status,
            sourceFile: allFiles[i].name,
          })));
        }

        setProgress(((i + 1) / allFiles.length) * 100);
      }

      setProcessedFiles(prev => [...prev, ...results.filter(r => !r.skipped)]);
      setProcessedSerialNumbers(prev => [...prev, ...newSerials]);
      setSuccess(`Rescanned ${allFiles.length} files`);
      
      if (fullRescanMode) {
        setSuccess(`Full rescan completed: ${allFiles.length} files processed`);
        setFullRescanMode(false);
      }
    } catch (err) {
      setError(`Error scanning files: ${err.message}`);
      console.error("Scan error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!folderHandle || !isWatching) return;

    const intervalId = setInterval(() => {
      scanAllFiles();
    }, 30000); // Rescan every 30 seconds

    // Initial scan
    scanAllFiles();

    return () => {
      clearInterval(intervalId);
    };
  }, [folderHandle, isWatching, fullRescanMode]);

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

  const triggerFullRescan = () => {
    setFullRescanMode(true);
    fileCache.current = new Map(); // Clear cache to force full rescan
    setSuccess('Preparing full rescan...');
  };

  const resetAll = () => {
    setFolderHandle(null);
    setProcessedFiles([]);
    setIsWatching(false);
    setError(null);
    setSuccess(null);
    setProcessedSerialNumbers([]);
    fileCache.current = new Map();
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
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant="contained"
              color={isWatching ? 'error' : 'primary'}
              onClick={() => setIsWatching(!isWatching)}
              disabled={isProcessing}
              fullWidth
            >
              {isWatching ? 'Stop Watching' : 'Start Watching'}
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={triggerFullRescan}
              disabled={isProcessing}
              fullWidth
            >
              Force Full Rescan
            </Button>
          </Box>

          {isProcessing && (
            <Box sx={{ mb: 3 }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                Processing... {Math.round(progress)}%
                {fullRescanMode && ' (Full rescan in progress)'}
              </Typography>
            </Box>
          )}
        </>
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