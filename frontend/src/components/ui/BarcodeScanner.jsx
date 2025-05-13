import React, { useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const BarcodeScanner = ({ onScanSuccess }) => {
  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");

    html5QrCode.start(
        { facingMode: "environment" }, 
        {
            fps: 20,
            qrbox: 250,
            aspectRatio: 1.0,
            deviceId: null,  // Keep this as null unless you are specifying the device manually
            videoConstraints: {
            facingMode: "environment",
            width: { ideal: 1920 },  // Set a higher resolution
            height: { ideal: 1080 }, // Set a higher resolution
            },
        },
        (decodedText) => {
            onScanSuccess(decodedText);
            html5QrCode.stop();
        },
        (errorMessage) => {
            // Handle errors
            console.log(errorMessage);
        }
        );

    return () => {
      html5QrCode.stop().then(() => {
        html5QrCode.clear();
      });
    };
  }, [onScanSuccess]);

  return <div id="reader" style={{ width: "100%", height: "400px", border: "2px dashed lime" }} />;
};

export default BarcodeScanner;
