import React from "react";

function MockLink({ href, children, ...props }) {
  return React.createElement("a", { href, ...props }, children);
}

export default MockLink;
