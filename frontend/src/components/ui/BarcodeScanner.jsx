import React, { useEffect } from 'react';
import {Html5QrcodeScanner} from "html5-qrcode";

const BarcodeScanner = ({ onScanSuccess }) => {
  useEffect(() => {
    const html5QrcodeScanner = new Html5QrcodeScanner("reader");

    html5QrcodeScanner.start(
    { facingMode: "environment" }, 
    {
        fps: 20,
        qrbox: 250,
        aspectRatio: 1.0,
        deviceId: null,  // Keep this as null unless you are specifying the device manually
        videoConstraints: {
        facingMode: "environment",
        },
    },
    (decodedText) => {
        onScanSuccess(decodedText);
        html5QrcodeScanner.stop();
    },
    (errorMessage) => {
        // Handle errors
        console.log("QR Code scan error: ", errorMessage);
    }
    );

    return () => {
      html5QrcodeScanner.stop().then(() => {
        html5QrcodeScanner.clear();
      });
    };
  }, [onScanSuccess]);

  return (
    <div id="reader" style={{ position: 'relative', width: '100%', height: '100%', border: '2px dashed lime' }}>
      {/* Add a scanning box indicator */}
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '250px',
          height: '250px',
          border: '2px dashed #00ff00',  // Green dashed border
          backgroundColor: 'rgba(0, 255, 0, 0.2)',  // Semi-transparent background for the box
        }}
      ></div>
    </div>
  );
};

export default BarcodeScanner;
