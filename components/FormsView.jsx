import React from "react";

export default function FormsView({ status = "loaded", data = [], error = null }) {
  if (status === "loading") {
    return <div aria-busy="true">Loading forms...</div>;
  }

  if (status === "error") {
    return (
      <div role="alert">
        <p>Error loading forms.</p>
        <p>{error?.message || "Something went wrong."}</p>
        <button onClick={() => {}}>Retry</button>
      </div>
    );
  }

  if (status === "empty" || (status === "loaded" && data.length === 0)) {
    return (
      <div>
        <p>No forms available.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Forms</h2>
      <ul>
        {data.map((item, index) => (
          <li key={index}>{item.title}</li>
        ))}
      </ul>
    </div>
  );
}
