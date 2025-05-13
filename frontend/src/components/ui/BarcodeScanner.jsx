import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

const BarcodeScanner = ({ onScanSuccess }) => {
  const videoRef = useRef(null); // Reference to the video element
  const [scanning, setScanning] = useState(false);
  const [scanner, setScanner] = useState(null);

  // Start scanning only when scanning state is true
  useEffect(() => {
    if (!scanning) return;

    const codeReader = new BrowserMultiFormatReader();
    setScanner(codeReader);

    const startScanning = () => {
      if (videoRef.current) {
        // Start scanning the barcode from the camera feed
        codeReader
          .decodeFromVideoDevice(
            null, // Automatically use the first available camera
            videoRef.current, // The video element where the camera feed is displayed
            (result, error) => {
              if (result) {
                onScanSuccess(result.getText()); // Pass the scanned text
                codeReader.reset(); // Stop scanning after a successful scan
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
        scanner.reset(); // Reset scanner when done
      }
    };
  }, [scanning, onScanSuccess, scanner]);

  // Access the camera and display it in the video element
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        // Log the stream to ensure it's being received
        console.log('Camera stream:', stream);
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
            backgroundColor: 'rgba(0, 255, 0, 0.2)', // Green scanning box
          }}
        />
      )}
    </div>
  );
};

export default BarcodeScanner;
