import React, { useEffect, useRef } from "react";
import Quagga from "quagga";

const BarcodeScanner = ({ onScanSuccess }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    // Initialize QuaggaJS and start the barcode scanner
    Quagga.init(
      {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: videoRef.current, // The video element where the camera stream will be shown
        },
        decoder: {
          readers: ["code_128_reader", "ean_reader", "ean_8_reader", "upc_reader"], // Supported barcode formats
        },
      },
      (err) => {
        if (err) {
          console.error("Quagga initialization error:", err);
          return;
        }
        // Start scanning once initialized
        Quagga.start();
      }
    );

    // Listen for barcode detection event
    Quagga.onDetected((result) => {
      console.log("Barcode detected:", result);
      onScanSuccess(result.codeResult.code); // Return the scanned barcode value to parent
    });

    return () => {
      // Cleanup QuaggaJS instance on unmount
      Quagga.stop();
    };
  }, [onScanSuccess]);

  return (
    <div>
      <video ref={videoRef} style={{ width: "100%", height: "auto" }} />
    </div>
  );
};

export default BarcodeScanner;
