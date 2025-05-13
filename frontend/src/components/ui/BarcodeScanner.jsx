import React, { useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

const BarcodeScanner = ({ onScanSuccess }) => {
  useEffect(() => {
    // Create a new instance of Html5QrcodeScanner
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10, // Frames per second
      qrbox: 250, // Size of the QR code box
      rememberLastUsedCamera: true, // Optional: remember the last used camera
    });

    // Log the scanner object to make sure it's initialized correctly
    console.log("Scanner initialized:", scanner);

    // Start the scanner with the environment-facing camera
    scanner.start(
      { facingMode: "environment" }, // Specify the facing mode
      {
        fps: 10, // Frames per second
        qrbox: 250, // Size of the QR code box
        aspectRatio: 1.0, // Aspect ratio of the scanning box
      },
      (decodedText) => {
        console.log("Scanned QR Code:", decodedText);
        onScanSuccess(decodedText); // Call the success callback
      },
      (errorMessage) => {
        console.log("Scan error:", errorMessage); // Log any scan errors
      }
    ).catch((error) => {
      console.error("Failed to start scanner:", error);
    });

    return () => {
      // Cleanup the scanner on unmount
      scanner.stop().then(() => {
        scanner.clear();
      }).catch((error) => {
        console.error("Error stopping the scanner:", error);
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
