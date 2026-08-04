import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { installDevNoPersist } from "./lib/dev-no-persist";
import "./index.css";

installDevNoPersist();

createRoot(document.getElementById("root")!).render(<App />);

