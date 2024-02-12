import React from "react";
import image from "/img/austin-neill-Be7DMcK7k3o-unsplash.jpg";
import video from "/img/sea_waves_sound_effects_FreeMp4Downloader.Com.mp4";

const HelperDoc = () => {
  return (
    <div>
      <h3>Video and Image Compatibility</h3>

      <p>Here's an image:</p>
      <img src={image} alt="waves" />

      <p>And here's a video:</p>
      <video width="640" height="420" controls>
        <source src={video} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default HelperDoc;
