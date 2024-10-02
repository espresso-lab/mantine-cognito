import { useContext } from "react";
import {AuthContext} from "../Context/AuthContext";
import de from "../translations/de.ts";
import en from "../translations/en.ts";

export const useTranslation = () => {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error("useTranslation must be used within a AuthProvider");
    }

    if (context.language === "de") {
        return de;
    }

    return en;
};
