import React, { useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const BarcodeScanner = ({ onScanSuccess }) => {
  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");

    html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: 250,
      },
      (decodedText) => {
        onScanSuccess(decodedText);
        html5QrCode.stop();
      },
      (errorMessage) => {
        // Handle errors silently
      }
    );

    return () => {
      html5QrCode.stop().then(() => {
        html5QrCode.clear();
      });
    };
  }, [onScanSuccess]);

  return <div id="reader" style={{ width: "100%", border: "2px dashed lime", height: "300px" }} />;
};

export default BarcodeScanner;
