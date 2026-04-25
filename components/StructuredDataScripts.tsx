import { ReactNode } from "react";
import { structuredDataScripts } from "@/lib/schema";

export function StructuredDataScripts() {
  return (
    <>
      {structuredDataScripts.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
