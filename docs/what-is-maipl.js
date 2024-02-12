// docs/react-docs/MyReactComponent.js
import React from "react";
import Link from "@docusaurus/Link";

const whatIsMaipl = () => {
  return (
    <div>
      <p>
        MAIPL is an open-source web platform that will make AI techniques
        accessible to ocean researchers.
      </p>

      <h2>Features</h2>
      <ul>
        <li>
          <strong>Feature 1:</strong> More about feature 1 ...
          <a
            href="https://meridian.cs.dal.ca/"
            target="_blank"
            rel="noopener noreferrer"
            className="external-link"
          >
            External Link
          </a>
        </li>
        <li>
          <strong>Feature 2:</strong> More about feature 2 ...
          <ul>
            <li>Sub list for Feature 2</li>
          </ul>
        </li>
        <li>
          <strong>Feature 3 </strong>
          <a href="/react-docs/intro" className="internal-link ">
            Internal Link
          </a>
        </li>
      </ul>
    </div>
  );
};

export default whatIsMaipl;
