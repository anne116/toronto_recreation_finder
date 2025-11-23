import { useState, useEffect, useRef, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";

type ResizablePanelProps = {
    title: string;
    initialWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    onClose: () => void;
    children: ReactNode;
};

export default function ResizablePanel({
    title, 
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
            style={{
                width,
                flexShrink: 0,
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                borderLeft: "1px solid #e2e8f0",
                background: "#ffffff",
                position: "relative",
                zIndex: 10,
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderBottom: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    cursor: isDragging ? "col-resize" : "default",
                }}
            >

                <div
                    style={{
                        flex: 1,
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#0f172a",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {title}
                </div>
                <button
                    onClick={onClose}
                    style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 18,
                        lineHeight: 1,
                        color: "#94a3b8",
                        marginLeft: 8,
                    }}
                    aria-label="Close panel"
                >
                    x
                </button>
            </div>

            <div
                style={{
                    flex: 1,
                    overflow: "auto",
                }}
            >
                {children}
            </div>
            <div
                onMouseDown={startDrag}
                style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: 8,
                    height: "100%",
                    cursor: "col-resize",
                    zIndex: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "conter",
                }}
            >
                <span
                    style={{
                        userSelect: "none",
                        fontSize: 20,
                    }}
                    aria-hidden="true"
                >
                    ⋮
                </span>
            </div>
        </div>
    );
}