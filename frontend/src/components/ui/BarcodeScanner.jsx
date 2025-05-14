import React, { useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

const BarcodeScanner = ({ onScanSuccess }) => {
  useEffect(() => {
    // Create an instance of Html5QrcodeScanner
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 25,
      qrbox: 250,
      rememberLastUsedCamera: true,
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
