import {useState} from "react";

export default function usePersistentState<T>(initialValue: T, key: string): [T, (value: T) => void]{
    const [state, setState] = useState<T>(() => {
        const storedValue = localStorage.getItem(`use_persistent_storage_${key}`);
        return storedValue ? JSON.parse(storedValue) as T : initialValue;
    });

    const setStateWrapper = (newState: T) => {
        setState(newState);
        localStorage.setItem(`use_persistent_storage_${key}`, JSON.stringify(newState));
    };

    return [state, setStateWrapper];
}
