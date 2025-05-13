import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

const BarcodeScanner = ({ onScanSuccess }) => {
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const [scanner, setScanner] = useState(null);

  useEffect(() => {
    if (!scanning) return;

    // Set up ZXing scanner
    const codeReader = new BrowserMultiFormatReader();
    setScanner(codeReader);

    const startScanning = () => {
      if (videoRef.current) {
        codeReader
          .decodeFromVideoDevice(
            null, // Automatically choose the camera
            videoRef.current,
            (result, error) => {
              if (result) {
                onScanSuccess(result.getText()); // Call success handler with scanned text
                codeReader.reset(); // Stop the scanner after success
              } else if (error) {
                // Handle errors (you can log or display them)
                console.error(error);
              }
            }
          )
          .then(() => console.log('Started scanning successfully'))
          .catch((err) => console.error('Failed to start scanning', err));
      }
    };

    startScanning();

    return () => {
      if (scanner) {
        scanner.reset();
      }
    };
  }, [scanning, onScanSuccess, scanner]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <video ref={videoRef} style={{ width: '100%', height: '100%' }} />
      {scanning && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '250px',
            height: '250px',
            border: '2px dashed green',
            backgroundColor: 'rgba(0, 255, 0, 0.2)', // Light green background
          }}
        />
      )}
    </div>
  );
};

export default BarcodeScanner;
