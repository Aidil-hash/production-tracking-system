import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

const BarcodeScanner = ({ onScanSuccess }) => {
  const videoRef = useRef(null); // Reference for the video element
  const [scanning, setScanning] = useState(false);
  const [scanner, setScanner] = useState(null);

  // Start scanning when scanning state is true
  useEffect(() => {
    if (!scanning) return;

    const codeReader = new BrowserMultiFormatReader();
    setScanner(codeReader);

    const startScanning = () => {
      if (videoRef.current) {
        // Start decoding the barcode from the video stream
        codeReader
          .decodeFromVideoDevice(
            null, // Automatically select the first available camera
            videoRef.current, // Attach the video feed to this element
            (result, error) => {
              if (result) {
                onScanSuccess(result.getText()); // Send the result back
                codeReader.reset(); // Stop scanning after success
              } else if (error) {
                console.error(error);
              }
            }
          )
          .catch((err) => console.error('Error starting scanner:', err));
      }
    };

    startScanning();

    return () => {
      if (scanner) {
        scanner.reset(); // Stop scanning on cleanup
      }
    };
  }, [scanning, onScanSuccess, scanner]);

  useEffect(() => {
    // Access the camera and attach the stream to the video element
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log('Camera stream assigned:', stream); // Log the stream to verify
        }
      })
      .catch((err) => {
        console.error('Error accessing camera: ', err); // Log any error
      });
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* The video element where the stream will be displayed */}
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
