import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

const BarcodeScanner = ({ onScanSuccess }) => {
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null); // Video reference to display the feed
  const [scanner, setScanner] = useState(null);

  useEffect(() => {
    if (!scanning) return;

    const codeReader = new BrowserMultiFormatReader();
    setScanner(codeReader);

    const startScanning = () => {
      if (videoRef.current) {
        // Start scanning from the video device
        codeReader
          .decodeFromVideoDevice(
            null, // Auto-select camera device
            videoRef.current, // The video element to display the feed
            (result, error) => {
              if (result) {
                onScanSuccess(result.getText());
                codeReader.reset(); // Stop the scanner after success
              } else if (error) {
                console.error(error); // Log error if scanning fails
              }
            }
          )
          .then(() => console.log('Scanning started'))
          .catch((err) => console.error('Error starting scanning:', err));
      }
    };

    startScanning();

    return () => {
      if (scanner) {
        scanner.reset(); // Reset the scanner when done
      }
    };
  }, [scanning, onScanSuccess, scanner]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* The video element to display the camera feed */}
      <video ref={videoRef} style={{ width: '100%', height: '100%' }} />

      {/* Add scanning indicator if scanning */}
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
            backgroundColor: 'rgba(0, 255, 0, 0.2)',
          }}
        />
      )}
    </div>
  );
};

export default BarcodeScanner;
