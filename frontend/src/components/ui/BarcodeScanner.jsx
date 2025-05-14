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
    // Only initialize the Quagga scanner once the camera is ready
    if (scannerInitialized) {
      Quagga.init(
        {
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: videoRef.current, // Use the video element for the camera feed
            constraints: {
              width: 640,
              height: 480,
            },
            area: { // defines rectangle of the detection/localization area
              top: "15%",    // top offset
              right: "15%",  // right offset
              left: "15%",   // left offset
              bottom: "15%"  // bottom offset
            },
            singleChannel: false // true: only the red color-channel is read
          },
          decoder: {
            readers: ["code_128_reader"], // Supported barcode formats
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
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Video Feed */}
      <video
        ref={videoRef} // Attach the video element reference
        style={{ width: "100%", height: "auto" }}
        muted
        autoPlay
      />
      {/* Scanning Box */}
      <div
        className="scanning-box"
        style={{
          position: "absolute",
          top: "30%", // Adjust this to position the box where you want
          left: "50%",
          transform: "translateX(-50%)", // Center the box horizontally
          width: "80%", // Width of the scanning box
          height: "200px", // Height of the scanning box
          border: "2px solid #00FF00", // Green border for the scanning box
          backgroundColor: "rgba(0, 255, 0, 0.2)", // Semi-transparent background
          boxSizing: "border-box",
        }}
      >
        {/* This is the scanning box. You can adjust its size and position as needed */}
      </div>
    </div>
  );
};

export default BarcodeScanner;
