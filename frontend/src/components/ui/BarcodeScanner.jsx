import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

const BarcodeScanner = ({ onScanSuccess }) => {
  const videoRef = useRef(null); // Reference for the video element
  const [scanning, setScanning] = useState(false);
  const [scanner, setScanner] = useState(null);

  useEffect(() => {
    if (!scanning) return;

    const codeReader = new BrowserMultiFormatReader();
    setScanner(codeReader);

    // Start scanning the barcode from the camera feed
    const startScanning = () => {
      if (videoRef.current) {
        codeReader
          .decodeFromVideoDevice(
            null, // Automatically use the first available camera
            videoRef.current, // Attach video element
            (result, error) => {
              if (result) {
                onScanSuccess(result.getText()); // Pass the result on success
                codeReader.reset(); // Stop scanning after a successful scan
              } else if (error) {
                console.error(error); // Log error if scanning fails
              }
            }
          )
          .then(() => console.log('Scanning started successfully'))
          .catch((err) => console.error('Failed to start scanning:', err));
      }
    };

    // Call to start scanning
    startScanning();

    // Clean up scanner when component is unmounted or scanning is stopped
    return () => {
      if (scanner) {
        scanner.reset();
      }
    };
  }, [scanning, onScanSuccess, scanner]);

  useEffect(() => {
    // Access the user's camera (rear camera preferred)
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        // Attach video stream to the video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => console.log('Error accessing camera:', err));
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Video element to show camera feed */}
      <video ref={videoRef} style={{ width: '100%', height: '100%' }} />
      {/* Scanning box positioned in the middle of the video feed */}
      {scanning && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '250px',
            height: '250px',
            border: '2px dashed green', // Green dashed border for scanning box
            backgroundColor: 'rgba(0, 255, 0, 0.2)', // Light green background for visibility
          }}
        />
      )}
    </div>
  );
};

export default BarcodeScanner;
