import React from "react";

import ArtBoard from "./artboard";
import "./styles.scss";

export default function App() {
  return (
    <div className="App" style={{transformOrigin: '0px 0px', transform: 'scale(0.8)'}}>
      <ArtBoard showRuler={false} />
    </div>
  );
}
