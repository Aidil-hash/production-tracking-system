import React, { useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

const BarcodeScanner = ({ onScanSuccess }) => {
  useEffect(() => {
    // Create an instance of Html5QrcodeScanner
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 25,
      qrbox: 250,
      rememberLastUsedCamera: true,
      scanTypeSelector: {
        supportedScanTypes: ["QR_CODE", "EAN_13", "EAN_8", "CODE_128", "CODE_39"], // Allow scanning for various barcode types
      },
    });

    // Start the scanner using render method (for v2.x)
    scanner.render(
      // Success callback for when a QR code is scanned
      (decodedText) => {
        console.log("Scanned QR Code:", decodedText);
        onScanSuccess(decodedText); // Handle the scan success
      },
      // Error callback to handle scanning issues
      (errorMessage) => {
        console.error("Scan error:", errorMessage); // Handle errors
      }
    );

    // Cleanup when the component unmounts
    return () => {
      try {
        scanner.stop().then(() => {
          scanner.clear();
        }).catch((error) => {
          console.error("Error stopping the scanner:", error);
        });
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
    };
  }, [onScanSuccess]);

  return <div id="reader" style={{ position: 'relative', width: '100%', height: '100%', border: '2px dashed lime' }}/>
    
};

export default BarcodeScanner;
