import {useState} from "react";

export default function usePersistentState<T>(initialValue: T, key: string): [T, (value: T) => void]{
    const [state, setState] = useState<T>(() => {
        try {
            const storedValue = localStorage.getItem(`use_persistent_storage_${key}`);
            return storedValue ? JSON.parse(storedValue) as T : initialValue;
        } catch {
            return initialValue;
        }
    });

    const setStateWrapper = (newState: T) => {
        setState(newState);
        try {
            localStorage.setItem(`use_persistent_storage_${key}`, JSON.stringify(newState));
        } catch { }
    };

    return [state, setStateWrapper];
}
