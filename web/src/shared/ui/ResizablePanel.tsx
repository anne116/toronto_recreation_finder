import { useState, useEffect, useRef, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";

type ResizablePanelProps = {
    title: string;
    pills?: string[];
    initialWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    onClose: () => void;
    children: ReactNode;
};

export default function ResizablePanel({
    title,
    pills = [],
    initialWidth = 400,
    minWidth = 280,
    maxWidth = 640,
    onClose,
    children,
}: ResizablePanelProps ) {
    const [width, setWidth] = useState(initialWidth);
    const [isDragging, setIsDragging] = useState(false);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const panelLeftRef = useRef(0);

    function startDrag(e: ReactMouseEvent<HTMLDivElement>) {
        e.preventDefault();
        if (panelRef.current) {
            const rect = panelRef.current.getBoundingClientRect();
            panelLeftRef.current = rect.left;
        }
        setIsDragging(true);
    }

    useEffect( () => {
        function handleMouseMove(e: MouseEvent) {
            if (!isDragging) return ;
            const left = panelLeftRef.current;
            const newWidth = Math.min(
                maxWidth,
                Math.max(minWidth, e.clientX - left)
            );
            setWidth(newWidth);
        }

        function handleMouseUp() {
            if (isDragging) {
                setIsDragging(false);
            }
        }

        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, minWidth, maxWidth]);


    return (
        <div
            ref={panelRef}
            className="resizable-panel"
            style={{ width }}
        >
            <div
              className="resizable-panel__header"
              style={{ cursor: isDragging ? "col-resize" : "default"}}
            >
                <div className="resizable-panel__header-row">
                    <div className="resizable-panel__title">
                        {title}
                    </div>
                    <button
                        onClick={onClose}
                        className="resizable-panel__close"
                        aria-label="Close panel"
                    >
                        ✕
                    </button>
                </div>
                {pills.length > 0 && (
                    <div className="filter-pill-row">
                        {pills.map((pill) => (
                            <span key={pill} className="filter-pill">
                                {pill}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="resizable-panel__body">
                {children}
            </div>

            <div
                onMouseDown={startDrag}
                className="resizable-panel__handle"
            >
                <span
                    style={{ userSelect: "none", fontSize: 20 }}
                    aria-hidden="true"
                >
                    ⋮
                </span>
            </div>
        </div>
    );
}