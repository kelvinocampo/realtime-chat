import { v4 as uuidv4 } from "uuid";

export function getClientId(): string {
    if (typeof window === "undefined") return "";
    let id = localStorage.getItem("client_id");
    if (!id) {
        id = uuidv4();
        localStorage.setItem("client_id", id);
    }
    return id;
}
