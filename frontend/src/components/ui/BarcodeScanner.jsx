import React, { useEffect, useRef, useState } from "react";
import Quagga from "quagga";
import adapter from "webrtc-adapter"; // Import webrtc-adapter

const BarcodeScanner = ({ onScanSuccess }) => {
  const videoRef = useRef(null); // Reference to the video element
  const [scannerInitialized, setScannerInitialized] = useState(false);

  useEffect(() => {
    // Initialize the camera using webrtc-adapter for cross-browser compatibility
    const initializeCamera = async () => {
      try {
        // Get the video stream from the camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {facingMode: "environment"}, // Use video stream (camera feed)
        });

        // Attach the stream to the video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Initialize Quagga scanner only after the camera is ready
        setScannerInitialized(true);
      } catch (error) {
          // If rear camera is not available, fall back to the front camera
          console.warn("Rear camera not available, falling back to front camera.");
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" }, // Use the front camera if rear camera fails
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          // Initialize Quagga scanner only after the camera is ready
          setScannerInitialized(true);
        }
    };

    initializeCamera();

    return () => {
      // Cleanup Quagga and stop the camera stream when the component is unmounted
      Quagga.stop();
    };
  }, []);

  useEffect(() => {
    const qrboxSize = window.innerWidth < 600 ? 200 : 400; // Adjust the scanning box size for mobile or desktop
    // Only initialize the Quagga scanner once the camera is ready
    if (scannerInitialized) {
      Quagga.init(
        {
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: videoRef.current, // Use the video element for the camera feed
            constraints: {
              width: 1000,
              height: 750,
            },
            area: { // defines rectangle of the detection/localization area
              top: "0%",    // top offset
              right: "0%",  // right offset
              left: "0%",   // left offset
              bottom: "0%"  // bottom offset
            },
            singleChannel: false // true: only the red color-channel is read
          },
          decoder: {
            readers: ["code_39_reader", "code_128_reader"], // Supported barcode formats
            debug: {
              drawBoundingBox: true,
              showFrequency: false,
              drawScanline: true,
              showPattern: false
          },
          multiple: false, // Set to true if you want to detect multiple barcodes at once
          },
          locator: {
            patchSize: "medium", // Adjust patch size for mobile devices
          },
          qrbox: qrboxSize, // Set the size of the QR code box
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
        playsInline
      />
    </div>
  );
};

export default BarcodeScanner;
