import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
import App from "./App";
import "./index.css";

window.Buffer = Buffer;

createRoot(document.getElementById("root")!).render(<App />);
