import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

const BarcodeScanner = ({ onScanSuccess }) => {
  const videoRef = useRef(null); // Reference for video element
  const [scanning, setScanning] = useState(false);
  const [scanner, setScanner] = useState(null);

  useEffect(() => {
    if (!scanning) return;

    const codeReader = new BrowserMultiFormatReader();
    setScanner(codeReader);

    const startScanning = () => {
      if (videoRef.current) {
        // Start scanning using ZXing from the video stream
        codeReader
          .decodeFromVideoDevice(
            null, // Automatically use the first available camera
            videoRef.current, // Video element reference
            (result, error) => {
              if (result) {
                onScanSuccess(result.getText()); // Call success handler
                codeReader.reset(); // Stop scanning after success
              } else if (error) {
                console.error(error); // Log error if scanning fails
              }
            }
          )
          .catch((err) => console.error('Failed to start scanning:', err));
      }
    };

    startScanning();

    return () => {
      if (scanner) {
        scanner.reset(); // Reset scanner on cleanup
      }
    };
  }, [scanning, onScanSuccess, scanner]);

  useEffect(() => {
    // Access the camera and attach to the video element
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.log('Error accessing camera: ', err);
      });
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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
            backgroundColor: 'rgba(0, 255, 0, 0.2)', // Light green box for scanning area
          }}
        />
      )}
    </div>
  );
};

export default BarcodeScanner;
