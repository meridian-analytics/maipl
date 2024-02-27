import React from "react";

const IntroPage = () => {
  return (
    <div>
      <p>
        Donec sagittis pretium purus sit amet fermentum.{" "}
        <strong>Phasellus eu pellentesque ligula</strong>. Ut porta neque dolor,
        sit amet euismod nisl mattis ut. Sed pharetra tortor velit, a viverra
        arcu lacinia at. Aliquam quis metus posuere, dictum risus vitae, pretium
        velit. Sed venenatis ex vel pulvinar commodo. Mauris id sem est. Ut id
        turpis malesuada, vestibulum ligula in, congue purus. Aenean nibh orci,
        ultrices sit amet laoreet finibus, vulputate at tortor. Curabitur
        vulputate ac nibh et aliquam. Donec arcu elit, volutpat sit amet ipsum
        sed, consequat tempor nisi. Maecenas orci tortor, tempus eu condimentum
        eu, tempus consequat diam.
      </p>

      <h3>What you'll need</h3>
      <ul>
        <li>dictum neque nec, interdum lorem</li>
        <li>Donec malesuada tristique ultricies</li>
        <li>
          Praesent lorem nisi
          <ul>
            <li>dictum nec sapien id, vestibulum blandit turpis.</li>
          </ul>
        </li>
      </ul>

      <h2>Install dependencies</h2>
      <pre>
        <code>npm install</code>
      </pre>
      <p>
        Phasellus dolor ipsum, accumsan ac ante tristique, euismod dapibus leo.
        Etiam tincidunt ac metus nec ullamcorper. Nam at felis luctus, molestie
        ante eget, malesuada nulla.
      </p>

      <h2>Run server</h2>
      <pre>
        <code>cd some-folder npm run start</code>
      </pre>
    </div>
  );
};

export default IntroPage;
