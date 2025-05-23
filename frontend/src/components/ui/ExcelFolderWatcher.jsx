import React, { useState, useEffect } from 'react';
import { 
  Button, Typography, Box, LinearProgress, List, ListItem, ListItemText, IconButton, Paper, Alert 
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
  const [processedSerialNumbers, setProcessedSerialNumbers] = useState([]); // Store serial numbers for review

  const requestFolderAccess = async () => {
    try {
      setError(null);
      const handle = await window.showDirectoryPicker();
      setFolderHandle(handle);
      setSuccess(`Watching folder: ${handle.name}`);
    } catch (err) {
      setError('Folder access was denied or cancelled');
      console.error("Folder access error:", err);
    }
  };

  const processFile = async (fileHandle) => {
    try {
      const file = await fileHandle.getFile();
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!modelName || !authToken) {
        setError('Missing model name or authentication token');
        return { fileName: file.name, success: false, error: 'Missing model name or auth token' };
      }

      const results = [];
      const serialNumbers = []; // Collect serial numbers for review before submission
      for (const item of jsonData) {
        const serialNumber = item.serialNumber || item['Serial Number'] || item.SERIAL;
        const testStatus = item.testStatus || item.Status || 'UNKNOWN';

        if (!serialNumber) {
          results.push({ serialNumber: 'N/A', success: false, message: 'Missing serial number in record' });
          continue;
        }

        // Collect serial numbers to show before submission
        serialNumbers.push({ serialNumber, status: testStatus });

        try {
          const response = await fetch(`/api/lines/${lineId}/scan`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ modelName, serialNumber, serialStatus: testStatus }),
          });

          const resData = await response.json();
          if (!response.ok) {
            results.push({ serialNumber, success: false, message: resData.message || 'API error' });
          } else {
            results.push({ serialNumber, success: true, message: resData.message });
          }
        } catch (apiErr) {
          results.push({ serialNumber, success: false, message: apiErr.message });
        }
      }

      // Save processed serial numbers for review before submission
      setProcessedSerialNumbers(serialNumbers);

      return { fileName: file.name, data: results, success: true };
    } catch (err) {
      console.error(`Error processing ${fileHandle.name}:`, err);
      return { fileName: fileHandle.name, error: err.message, success: false };
    }
  };

  useEffect(() => {
    if (!folderHandle || !isWatching) return;

    let intervalId;
    const knownFiles = new Set(processedFiles.map(f => f.fileName));

    const checkForNewFiles = async () => {
      try {
        const newFiles = [];
        for await (const entry of folderHandle.values()) {
          if (
            entry.kind === 'file' &&
            entry.name.match(/\.(xlsx|xls|csv)$/i) &&
            !knownFiles.has(entry.name)
          ) {
            newFiles.push(entry);
            knownFiles.add(entry.name);
          }
        }

        if (newFiles.length > 0) {
          setIsProcessing(true);
          setProgress(0);

          const results = [];
          for (let i = 0; i < newFiles.length; i++) {
            const result = await processFile(newFiles[i]);
            results.push(result);
            setProgress(((i + 1) / newFiles.length) * 100);
          }

          setProcessedFiles(prev => [...prev, ...results]);
          setSuccess(`Processed ${newFiles.length} new file(s)`);

          if (onBatchProcessed) onBatchProcessed(results);

          setIsProcessing(false);
        }
      } catch (err) {
        setError(`Error checking folder: ${err.message}`);
        console.error("Folder check error:", err);
      }
    };

    intervalId = setInterval(checkForNewFiles, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, [folderHandle, isWatching, processedFiles, modelName, authToken]);

  const resetAll = () => {
    setFolderHandle(null);
    setProcessedFiles([]);
    setIsWatching(false);
    setError(null);
    setSuccess(null);
    setProcessedSerialNumbers([]); // Clear processed serials
  };

  const handleSubmit = async () => {
    if (processedSerialNumbers.length === 0) {
      setError('No serial numbers to submit.');
      return;
    }

    try {
      // Prepare payload with serial numbers and their status
      const serialNumbers = processedSerialNumbers.map(sn => ({
        serialNumber: sn.serialNumber,
        serialStatus: sn.status,  // We submit the status as well (PASS or NG)
      }));

      const response = await fetch(`/api/lines/${lineId}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ modelName, serialNumbers }),
      });

      const resData = await response.json();
      if (response.ok) {
        setSuccess(`Successfully submitted ${serialNumbers.length} serial numbers.`);
      } else {
        setError(resData.message || 'Submission failed.');
      }
    } catch (err) {
      setError('Failed to submit serial numbers.');
      console.error('Submission error:', err);
    }
  };

  return (
    <Box sx={{ 
      p: 3,
      border: '1px solid #ccc',
      borderRadius: 2,
      maxWidth: 800,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }}>
      <Typography variant="h6" component="h2">
        Excel Batch Upload
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        {!folderHandle ? (
          <Button
            variant="contained"
            onClick={requestFolderAccess}
            size="large"
          >
            Select Folder
          </Button>
        ) : (
          <>
            <Typography sx={{ flexGrow: 1 }}>
              <strong>Selected Folder:</strong> {folderHandle.name}
            </Typography>
            <IconButton onClick={resetAll} color="error">
              Reset
            </IconButton>
          </>
        )}
      </Box>

      {folderHandle && (
        <Button
          variant="contained"
          color={isWatching ? 'error' : 'success'}
          onClick={() => setIsWatching(!isWatching)}
          disabled={isProcessing}
          fullWidth
          size="large"
        >
          {isWatching ? 'Stop Watching' : 'Start Watching'}
        </Button>
      )}

      {isProcessing && (
        <Box sx={{ width: '100%' }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="body2" align="center" sx={{ mt: 1 }}>
            Processing... {Math.round(progress)}%
          </Typography>
        </Box>
      )}

      <Paper elevation={3} sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
        <Typography variant="subtitle1" gutterBottom>
          Processed Files ({processedFiles.length})
        </Typography>

        {processedFiles.length === 0 ? (
          <Typography color="text.secondary">
            No files processed yet.
          </Typography>
        ) : (
          <List dense>
            {processedFiles.map((file, index) => (
              <ListItem
                key={index}
                divider
                sx={{ bgcolor: file.success ? 'action.hover' : 'error.light' }}
              >
                <ListItemText
                  primary={file.fileName}
                  secondary={
                    file.success
                      ? `Processed ${file.data.length} records`
                      : `Error: ${file.error || 'Unknown error'}`
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Display Serial Numbers for Review */}
      <Typography variant="h6" component="h2" sx={{ mt: 3 }}>
        Processed Serial Numbers
      </Typography>
      <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
        <List dense>
          {processedSerialNumbers.map((sn, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={sn.serialNumber}
                secondary={`Status: ${sn.status}`}
              />
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Submit Button */}
      <Box sx={{ mt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={processedSerialNumbers.length === 0}
        >
          Submit Processed Serial Numbers
        </Button>
      </Box>
    </Box>
  );
};

export default ExcelFolderWatcher;
