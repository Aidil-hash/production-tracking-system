import React, { useEffect, useRef, useState } from "react";
import Quagga from "quagga";
import adapter from "webrtc-adapter"; // Import webrtc-adapter

const BarcodeScanner = ({ onScanSuccess }) => {
  const videoRef = useRef(null); // Reference to the video element
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const qrboxSize = window.innerWidth < 600 ? 200 : 250;

  useEffect(() => {
    // Initialize the camera using webrtc-adapter for cross-browser compatibility
    const initializeCamera = async () => {
      try {
        // Get the video stream from the camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true, // Use video stream (camera feed)
        });

        // Attach the stream to the video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Initialize Quagga scanner only after the camera is ready
        setScannerInitialized(true);
      } catch (error) {
        console.error("Error accessing camera:", error);
      }
    };

    initializeCamera();

    return () => {
      // Cleanup Quagga and stop the camera stream when the component is unmounted
      Quagga.stop();
    };
  }, []);

  useEffect(() => {
    // Only initialize the Quagga scanner once the camera is ready
    if (scannerInitialized) {
      Quagga.init(
        {
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: videoRef.current, // Use the video element for the camera feed
          },
          decoder: {
            readers: ["code_128_reader", "ean_reader", "ean_8_reader", "upc_reader", "code_39_reader"], // Supported barcode formats
          },
          locator: {
            patchSize: "medium", // Adjust patch size for mobile devices
          },
          qrbox: qrboxSize, // Set the size of the QR box for scanning
        },
        (err) => {
          if (err) {
            console.error("Quagga initialization error:", err);
            return;
          }

          // Start scanning once Quagga is initialized
          Quagga.start();
        }
      );

      // Event listener for barcode detection
      Quagga.onDetected((result) => {
        console.log("Barcode detected:", result);
        onScanSuccess(result.codeResult.code); // Return the scanned barcode value to parent
      });

      return () => {
        // Cleanup when the component unmounts
        Quagga.stop();
      };
    }
  }, [scannerInitialized, onScanSuccess]);

  return (
    <div>
      <video
        ref={videoRef} // Attach the video element reference
        style={{ width: "100%", height: "auto" }}
        muted
        autoPlay
      />
    </div>
  );
};

export default BarcodeScanner;
