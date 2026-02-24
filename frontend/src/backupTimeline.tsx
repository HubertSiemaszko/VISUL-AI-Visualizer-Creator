import React, { useState, useRef, useEffect, useCallback } from "react";

type ClipType = {
    id: string;
    title: string;
    start: number;
    duration: number;
    track: number;
    type: "video" | "audio" | "placeholder";
    videoUrl?: string;
    audioUrl?: string;
    linkedAudioId?: string;
    linkedVideoId?: string;
};

const Timeline = () => {
    const [clips, setClips] = useState<ClipType[]>([
    {
        id: "1",
        title: "Sample Video",
        start: 0,
        duration: 120,
        track: 0,
        type: "video" as const,
        videoUrl: "http://127.0.0.1:8000/video",
        linkedAudioId: `clip-${Date.now()}`
    },
    {
        id: "audio-1",
        title: "Sample Video Audio",
        start: 0,
        duration: 120,
        track: 3,
        type: "audio" as const,
        audioUrl: "http://127.0.0.1:8000/video",
        linkedVideoId: `audio-${Date.now()}`
    },
]);

    const [currentTime, setCurrentTime] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const animationRef = useRef<number | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [selectedClip, setSelectedClip] = useState<string|null>(null);
    const [splitMode, setSplitMode] = useState(false);
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
    const SNAP_THRESHOLD = 10; // piksele

    type DragState = {
        clipId: string;
        originalStart: number;
        originalDuration: number;
        originalTrack: number;
        action: "move" | "resize-left" | "resize-right";
        startX: number;
        startY: number;
    };

    const [dragState, setDragState] = useState<DragState | null>(null);

    const dragOffsetRef = useRef(0);
    const lastUpdateTimeRef = useRef(Date.now());

    const TIMELINE_WIDTH = 800;
    const [zoomLevel, setZoomLevel] = useState(1.5);
    const PIXEL_PER_SECOND = zoomLevel;
    const TRACK_HEIGHT = 60;
    const VIDEO_TRACKS = 3;
    const AUDIO_TRACKS = 3;
    const TRACK_COUNT = VIDEO_TRACKS + AUDIO_TRACKS;
    const timelineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch('http://127.0.0.1:8000/clips')
            .then(res => res.json())
            .then(data => {
                if (data.clips && data.clips.length > 0) {
                    console.log('✅ Załadowano klipy:', data.clips);
                    setClips(data.clips);
                }
            })
            .catch(err => console.error('❌ Błąd ładowania klipów:', err));
    }, []);

    const loadClipsFromBackend = async () => {
    try {
        const response = await fetch('http://127.0.0.1:8000/clips');
        const data = await response.json();

        if (data.clips && data.clips.length > 0) {
            setClips(data.clips);
            console.log(`✅ Załadowano ${data.clips.length} klipów`);
        }
    } catch (err) {
        console.error('❌ Błąd ładowania:', err);
    }
};

    const getActiveClip = useCallback((time:number, clipType:string) => {
        return clips.find(clip =>
            clip.type === clipType &&
            time >= clip.start &&
            time < clip.start + clip.duration
        );
    }, [clips]);

    useEffect(() => {
        if (!videoRef.current) return;

        const activeVideoClip = getActiveClip(currentTime, "video");

        if (activeVideoClip) {
            const clipLocalTime = currentTime - activeVideoClip.start;

            if (Math.abs(videoRef.current.currentTime - clipLocalTime) > 0.5) {
                videoRef.current.currentTime = clipLocalTime;
            }

            if (isPlaying && videoRef.current.paused) {
                videoRef.current.play().catch(e => console.log("Play error:", e));
            } else if (!isPlaying && !videoRef.current.paused) {
                videoRef.current.pause();
            }

            videoRef.current.style.opacity = "1";
        } else {
            videoRef.current.style.opacity = "0.3";
            if (!videoRef.current.paused) {
                videoRef.current.pause();
            }
        }
    }, [currentTime, isPlaying, getActiveClip]);

useEffect(() => {
    if (!audioRef.current) return;

    const activeAudioClip = getActiveClip(currentTime, "audio");

    if (activeAudioClip && activeAudioClip.audioUrl) {
        if (audioRef.current.src !== activeAudioClip.audioUrl) {
            console.log("🎵 Ładuję audio:", activeAudioClip.audioUrl);
            audioRef.current.src = activeAudioClip.audioUrl;
            audioRef.current.load();

            audioRef.current.addEventListener('loadeddata', () => {
                if (isPlaying) {
                    audioRef.current?.play().catch(e => console.log("Audio play error:", e));
                }
            }, { once: true });
        }

        const clipLocalTime = currentTime - activeAudioClip.start;

        if (audioRef.current.readyState >= 2) {
            if (Math.abs(audioRef.current.currentTime - clipLocalTime) > 0.5) {
                audioRef.current.currentTime = clipLocalTime;
            }
        }

        if (isPlaying && audioRef.current.paused && audioRef.current.readyState >= 2) {
            audioRef.current.play().catch(e => console.log("Audio play error:", e));
        } else if (!isPlaying && !audioRef.current.paused) {
            audioRef.current.pause();
        }
    } else {
        if (!audioRef.current.paused) {
            audioRef.current.pause();
        }
    }
}, [currentTime, isPlaying, getActiveClip]);

    useEffect(() => {
        if (isPlaying) {
            const animate = () => {
                const now = Date.now();
                const delta = (now - lastUpdateTimeRef.current) / 1000;
                lastUpdateTimeRef.current = now;

                setCurrentTime((prev) => {
                    const newTime = prev + delta;
                    return newTime > 500 ? 0 : newTime;
                });
                animationRef.current = requestAnimationFrame(animate);
            };
            lastUpdateTimeRef.current = Date.now();
            animationRef.current = requestAnimationFrame(animate);
        } else {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        }
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isPlaying]);

    const addNewClip = () => {
        const newClip: ClipType = {
            id: `clip-${Date.now()}`,
            title: `Placeholder ${clips.length + 1}`,
            start: 0,
            duration: 100,
            track: 0,
            type: "placeholder" as const
        };
    setClips([...clips, newClip]);
};

    const addVideoClip = () => {
    const videoId = `clip-${Date.now()}`;
    const audioId = `audio-${Date.now()}`;

    const videoClip: ClipType = {
        id: videoId,
        title: "Sample Video",
        start: 0,
        duration: 120,
        track: 0,
        type: "video" as const,
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        linkedAudioId: audioId
    };

    const audioClip: ClipType = {
        id: audioId,
        title: "Sample Video Audio",
        start: 0,
        duration: 120,
        track: VIDEO_TRACKS,
        type: "audio" as const,
        audioUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        linkedVideoId: videoId
    };

    setClips([...clips, videoClip, audioClip]);
};

    const handleClipClick = (e: React.MouseEvent<HTMLDivElement>, clip: ClipType) => {
        if (splitMode) {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const splitTime = clickX / PIXEL_PER_SECOND;

            if (splitTime > 0 && splitTime < clip.duration) {
                const leftClip = {
                    ...clip,
                    id: `${clip.id}_left`,
                    duration: splitTime
                };
                const rightClip = {
                    ...clip,
                    id: `${clip.id}_right`,
                    start: clip.start + splitTime,
                    duration: clip.duration - splitTime
                };

                let newClips = clips.filter((c) => c.id !== clip.id);
                newClips.push(leftClip, rightClip);

                if (clip.type === "audio" && clip.linkedAudioId) {
                    const linkedAudio = clips.find(c => c.id === clip.linkedAudioId);
                    if (linkedAudio) {
                        const leftAudio = { ...linkedAudio, id: `${linkedAudio.id}_left`, duration: splitTime };
                        const rightAudio = { ...linkedAudio, id: `${linkedAudio.id}_right`, start: linkedAudio.start + splitTime, duration: linkedAudio.duration - splitTime };
                        newClips = newClips.filter(c => c.id !== clip.linkedAudioId);
                        newClips.push(leftAudio, rightAudio);
                    }
                }

                if (clip.type === "video" && clip.linkedVideoId) {
                    const linkedVideo = clips.find(c => c.id === clip.linkedVideoId);
                    if (linkedVideo) {
                        const leftVideo = { ...linkedVideo, id: `${linkedVideo.id}_left`, duration: splitTime };
                        const rightVideo = { ...linkedVideo, id: `${linkedVideo.id}_right`, start: linkedVideo.start + splitTime, duration: linkedVideo.duration - splitTime };
                        newClips = newClips.filter(c => c.id !== clip.linkedVideoId);
                        newClips.push(leftVideo, rightVideo);
                    }
                }

                setClips(newClips);
            }
        } else {
            setSelectedClip(clip.id);
        }
    };

    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (dragState) return;
        if (isDraggingPlayhead) return;
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const newTime = clickX / PIXEL_PER_SECOND;
        setCurrentTime(Math.max(0, Math.min(500, newTime)));
    };

    const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (dragState) return;
        if (!timelineRef.current) return;

        // Sprawdź czy kliknięto na klip
        const target = e.target as HTMLElement;
        if (target.closest('[data-clip-id]')) return;

        setIsDraggingPlayhead(true);
        const rect = timelineRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const newTime = clickX / PIXEL_PER_SECOND;
        setCurrentTime(Math.max(0, Math.min(500, newTime)));
    };

    const handleTimelineMouseMove = useCallback((e: MouseEvent) => {
        if (!isDraggingPlayhead) return;
        if (!timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const newTime = mouseX / PIXEL_PER_SECOND;
        setCurrentTime(Math.max(0, Math.min(500, newTime)));
    }, [isDraggingPlayhead, PIXEL_PER_SECOND]);

    const handleTimelineMouseUp = useCallback(() => {
        setIsDraggingPlayhead(false);
    }, []);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent<HTMLDivElement>, clip: ClipType) => {
            if (splitMode) return;
            e.stopPropagation();
            setSelectedClip(clip.id);

            setDragState({
                clipId: clip.id,
                originalStart: clip.start,
                originalTrack: clip.track,
                originalDuration: clip.duration,
                action: "move",
                startX: e.clientX,
                startY: e.clientY
            });
        },
        [splitMode]
    );

    const startResize = useCallback((e: React.MouseEvent<HTMLDivElement>, clip: ClipType, direction: "left" | "right") => {
        e.stopPropagation();
        setSelectedClip(clip.id);
        setDragState({
            clipId: clip.id,
            originalStart: clip.start,
            originalDuration: clip.duration,
            originalTrack: clip.track,
            action: direction === "left" ? "resize-left" : "resize-right",
            startX: e.clientX,
            startY: e.clientY
        });
    }, []);

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!dragState) return;
            if (!timelineRef.current) return;

            const deltaX = (e.clientX - dragState.startX) / PIXEL_PER_SECOND;
            const timelineRect = timelineRef.current.getBoundingClientRect();
            const relativeY = e.clientY - timelineRect.top;
            const newTrack = Math.max(0, Math.min(TRACK_COUNT - 1, Math.floor(relativeY / TRACK_HEIGHT)));

            setClips((prev) => {
                const draggedClip = prev.find(c => c.id === dragState.clipId);
                if (!draggedClip) return prev;

                let newStart = dragState.originalStart + deltaX;
                let newDuration = dragState.originalDuration;

                // SNAP LOGIC
                if (snapEnabled && dragState.action === "move") {
                    const snapPoints: number[] = [0]; // początek timeline'a

                    // Dodaj playhead jako snap point
                    snapPoints.push(currentTime);

                    // Dodaj krawędzie innych klipów jako snap points
                    prev.forEach(clip => {
                        if (clip.id !== dragState.clipId &&
                            !(draggedClip.linkedAudioId === clip.id || draggedClip.linkedVideoId === clip.id)) {
                            snapPoints.push(clip.start);
                            snapPoints.push(clip.start + clip.duration);
                        }
                    });

                    const draggedStart = newStart;
                    const draggedEnd = newStart + draggedClip.duration;

                    // Sprawdź czy początek klipu jest blisko jakiegoś snap pointa
                    for (const snapPoint of snapPoints) {
                        if (Math.abs(draggedStart - snapPoint) < SNAP_THRESHOLD / PIXEL_PER_SECOND) {
                            newStart = snapPoint;
                            break;
                        }
                    }

                    // Sprawdź czy koniec klipu jest blisko jakiegoś snap pointa
                    for (const snapPoint of snapPoints) {
                        if (Math.abs(draggedEnd - snapPoint) < SNAP_THRESHOLD / PIXEL_PER_SECOND) {
                            newStart = snapPoint - draggedClip.duration;
                            break;
                        }
                    }
                }

                // SNAP dla resize
                if (snapEnabled && (dragState.action === "resize-left" || dragState.action === "resize-right")) {
                    const snapPoints: number[] = [0, currentTime];

                    prev.forEach(clip => {
                        if (clip.id !== dragState.clipId &&
                            !(draggedClip.linkedAudioId === clip.id || draggedClip.linkedVideoId === clip.id)) {
                            snapPoints.push(clip.start);
                            snapPoints.push(clip.start + clip.duration);
                        }
                    });

                    if (dragState.action === "resize-left") {
                        const newStartCalc = Math.max(0, dragState.originalStart + deltaX);
                        newStart = newStartCalc;
                        newDuration = Math.max(0.5, dragState.originalDuration - deltaX);

                        for (const snapPoint of snapPoints) {
                            if (Math.abs(newStartCalc - snapPoint) < SNAP_THRESHOLD / PIXEL_PER_SECOND) {
                                newStart = snapPoint;
                                newDuration = Math.max(0.5, dragState.originalStart + dragState.originalDuration - snapPoint);
                                break;
                            }
                        }
                    }

                    if (dragState.action === "resize-right") {
                        newDuration = Math.max(0.5, dragState.originalDuration + deltaX);
                        const newEndCalc = dragState.originalStart + newDuration;

                        for (const snapPoint of snapPoints) {
                            if (Math.abs(newEndCalc - snapPoint) < SNAP_THRESHOLD / PIXEL_PER_SECOND) {
                                newDuration = Math.max(0.5, snapPoint - dragState.originalStart);
                                break;
                            }
                        }
                    }
                }

                newStart = Math.max(0, newStart);

                return prev.map((clip) => {
                    if (clip.id !== dragState.clipId) {
                        const draggedClip = prev.find(c => c.id === dragState.clipId);
                        if (draggedClip && (draggedClip.linkedAudioId || draggedClip.linkedVideoId)) {
                            if (clip.id === draggedClip.linkedAudioId || clip.id === draggedClip.linkedVideoId) {
                                if (dragState.action === "move") {
                                    return { ...clip, start: newStart };
                                }
                                if (dragState.action === "resize-left") {
                                    return { ...clip, start: newStart, duration: newDuration };
                                }
                                if (dragState.action === "resize-right") {
                                    return { ...clip, duration: newDuration };
                                }
                            }
                        }
                        return clip;
                    }

                    if (dragState.action === "move") {
                        return { ...clip, start: newStart, track: newTrack };
                    }

                    if (dragState.action === "resize-left") {
                        return { ...clip, start: newStart, duration: newDuration };
                    }

                    if (dragState.action === "resize-right") {
                        return { ...clip, duration: newDuration };
                    }

                    return clip;
                });
            });
        },
        [dragState, PIXEL_PER_SECOND, TRACK_COUNT, TRACK_HEIGHT, snapEnabled, currentTime, SNAP_THRESHOLD]
    );

    const handleMouseUp = useCallback(() => setDragState(null), []);

    const deleteSelectedClip = () => {
        if (selectedClip) {
            const clipToDelete = clips.find(c => c.id === selectedClip);
            if (!clipToDelete) return;

            let clipsToRemove = [selectedClip];

            if (clipToDelete.linkedAudioId) clipsToRemove.push(clipToDelete.linkedAudioId);
            if (clipToDelete.linkedVideoId) clipsToRemove.push(clipToDelete.linkedVideoId);

            setClips(clips.filter(c => !clipsToRemove.includes(c.id)));
            setSelectedClip(null);
        }
    };

    const unlinkSelectedClip = () => {
        if (selectedClip) {
            const clipToUnlink = clips.find(c => c.id === selectedClip);

            setClips(clips.map(clip => {
                if (clip.id === selectedClip) {
                    const { linkedAudioId, linkedVideoId, ...rest } = clip;
                    return rest;
                }
                if (clip.id === clipToUnlink?.linkedAudioId || clip.id === clipToUnlink?.linkedVideoId) {
                    const { linkedAudioId, linkedVideoId, ...rest } = clip;
                    return rest;
                }
                return clip;
            }));
        }
    };

    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        const videoId = `clip-${Date.now()}`;
        const audioId = `audio-${Date.now()}`;

        const videoClip: ClipType = {
            id: videoId,
            title: file.name,
            start: 0,
            duration: 120,
            track: 0,
            type: "video" as const,
            videoUrl: url,
            linkedAudioId: audioId
        };

        const audioClip: ClipType = {
            id: audioId,
            title: `${file.name} (Audio)`,
            start: 0,
            duration: 120,
            track: VIDEO_TRACKS,
            type: "audio" as const,
            audioUrl: url,
            linkedVideoId: videoId
        };

        setClips([...clips, videoClip, audioClip]);
    }
};

    useEffect(() => {
        if (dragState) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
            return () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
            };
        }
    }, [dragState, handleMouseMove, handleMouseUp]);

    useEffect(() => {
        if (isDraggingPlayhead) {
            document.addEventListener("mousemove", handleTimelineMouseMove);
            document.addEventListener("mouseup", handleTimelineMouseUp);
            return () => {
                document.removeEventListener("mousemove", handleTimelineMouseMove);
                document.removeEventListener("mouseup", handleTimelineMouseUp);
            };
        }
    }, [isDraggingPlayhead, handleTimelineMouseMove, handleTimelineMouseUp]);

    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (!timelineRef.current) return;

            const rect = timelineRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;

            if (mouseX >= 0 && mouseX <= rect.width &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {

                e.preventDefault();

                const zoomSpeed = e.ctrlKey || e.metaKey ? 0.2 : 0.1;
                const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;

                setZoomLevel(prev => {
                    const newZoom = Math.max(0.2, Math.min(10, prev + delta));
                    return newZoom;
                });
            }
        };

        const timeline = timelineRef.current;
        if (timeline) {
            timeline.addEventListener('wheel', handleWheel, { passive: false });
            return () => timeline.removeEventListener('wheel', handleWheel);
        }
    }, [zoomLevel]);

    const activeVideoClip = getActiveClip(currentTime, "video");
    const activeAudioClip = getActiveClip(currentTime, "audio");

    return (
        <div style={{ padding: 20, fontFamily: "sans-serif", display: "flex", gap: 20 }}>
            <div style={{ flex: 1 }}>
                <h1>🎬 Video Timeline Editor</h1>

                <div style={{ marginBottom: 10 }}>
                    <button onClick={addNewClip}>Dodaj placeholder</button>
                    <button onClick={addVideoClip} style={{ marginLeft: 10 }}>Dodaj klip video</button>
                    <button onClick={() => setIsPlaying(!isPlaying)} style={{ marginLeft: 10 }}>
                        {isPlaying ? "⏸ Pause" : "▶ Play"}
                    </button>
                    <button onClick={() => setSplitMode(!splitMode)} style={{ marginLeft: 10 }}>
                        {splitMode ? "❌ Wyłącz cięcie" : "✂️ Włącz cięcie"}
                    </button>
                    <button
                        onClick={() => setSnapEnabled(!snapEnabled)}
                        style={{
                            marginLeft: 10,
                            background: snapEnabled ? "#10B981" : "#6B7280",
                            color: "white",
                            border: "none",
                            padding: "5px 10px",
                            cursor: "pointer"
                        }}
                    >
                        {snapEnabled ? "🧲 Magnes ON" : "🧲 Magnes OFF"}
                    </button>
                    <button onClick={loadClipsFromBackend} style={{ marginLeft: 10 }}>
    🔄 Wczytaj klipy z backendu
                    </button>
                    {selectedClip && !splitMode && (
                        <>
                            <button onClick={deleteSelectedClip} style={{ marginLeft: 10 }}>
                                🗑️ Usuń klip
                            </button>
                            {clips.find(c => c.id === selectedClip)?.linkedAudioId || clips.find(c => c.id === selectedClip)?.linkedVideoId ? (
                                <button onClick={unlinkSelectedClip} style={{ marginLeft: 10 }}>
                                    🔗 Rozłącz video/audio
                                </button>

                            ) : null}
                        </>
                    )}
                    <input type="file" accept="video/*" onChange={handleVideoUpload} style={{ marginLeft: 10 }} />
                </div>

                <div style={{ marginBottom: 10 }}>
                    🔍 Zoom: {zoomLevel.toFixed(2)}x
                    <button onClick={() => setZoomLevel(prev => Math.max(0.2, prev - 0.5))} style={{ marginLeft: 10 }}>-</button>
                    <button onClick={() => setZoomLevel(prev => Math.min(10, prev + 0.5))} style={{ marginLeft: 5 }}>+</button>
                    <button onClick={() => setZoomLevel(1.5)} style={{ marginLeft: 5 }}>Reset</button>
                </div>

                <div style={{ marginBottom: 10 }}>
                    ⏱ Aktualny czas: {currentTime.toFixed(2)}s
                    {activeVideoClip && <span style={{ marginLeft: 20 }}>🎥 Video: {activeVideoClip.title}</span>}
                    {activeAudioClip && <span style={{ marginLeft: 20 }}>🔊 Audio: {activeAudioClip.title}</span>}
                </div>

                <div
                    ref={timelineRef}
                    onClick={handleTimelineClick}
                    onMouseDown={handleTimelineMouseDown}
                    style={{
                        position: "relative",
                        width: TIMELINE_WIDTH,
                        height: TRACK_HEIGHT * TRACK_COUNT,
                        border: "1px solid #333",
                        background: "#222",
                        overflow: "auto",
                        cursor: isDraggingPlayhead ? "grabbing" : "pointer"
                    }}
                >
                    {[...Array(TRACK_COUNT)].map((_, i) => (
                        <div
                            key={i}
                            style={{
                                position: "absolute",
                                top: i * TRACK_HEIGHT,
                                width: "100%",
                                height: TRACK_HEIGHT,
                                borderBottom: "1px solid #555",
                                background: i < VIDEO_TRACKS ? (i % 2 === 0 ? "#2a2a2a" : "#1f1f1f") : (i % 2 === 0 ? "#1a2a1a" : "#152015")
                            }}
                        >
                            <span style={{ color: "#888", position: "absolute", left: 5, top: 5, fontSize: 11 }}>
                                {i < VIDEO_TRACKS ? `V${i + 1}` : `A${i - VIDEO_TRACKS + 1}`}
                            </span>
                        </div>
                    ))}

                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            left: currentTime * PIXEL_PER_SECOND,
                            width: 2,
                            height: "100%",
                            background: "red",
                            zIndex: 100,
                            pointerEvents: "none"
                        }}
                    />

                    {clips.map((clip) => (
                        <div
                            key={clip.id}
                            data-clip-id={clip.id}
                            style={{
                                position: "absolute",
                                left: clip.start * PIXEL_PER_SECOND,
                                top: clip.track * TRACK_HEIGHT + 10,
                                width: clip.duration * PIXEL_PER_SECOND,
                                height: 40,
                                backgroundColor: selectedClip === clip.id ? "#FFD700" :
                                    clip.type === "video" ? "#10B981" :
                                        clip.type === "audio" ? "#8B5CF6" : "#3B82F6",
                                border: "1px solid #000",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontWeight: "bold",
                                userSelect: "none",
                                fontSize: 11
                            }}
                        >
                            <div
                                onMouseDown={(e) => startResize(e, clip, "left")}
                                style={{
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    width: 1,
                                    height: "100%",
                                    background: "rgba(255,255,255,0.2)",
                                    cursor: "ew-resize",
                                    zIndex: 2
                                }}
                            />

                            <div
                                onMouseDown={(e) => handleMouseDown(e, clip)}
                                onClick={(e) => handleClipClick(e, clip)}
                                style={{
                                    width: "100%",
                                    textAlign: "center",
                                    cursor: splitMode ? "crosshair" : "grab",
                                    zIndex: 3,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    padding: "0 20px"
                                }}
                            >
                                {clip.type === "video" ? "🎥" : clip.type === "audio" ? "🔊" : ""} {clip.title}
                            </div>

                            <div
                                onMouseDown={(e) => startResize(e, clip, "right")}
                                style={{
                                    position: "absolute",
                                    right: 0,
                                    top: 0,
                                    width: 3,
                                    height: "100%",
                                    background: "rgba(255,255,255,0.2)",
                                    cursor: "ew-resize",
                                    zIndex: 2
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ width: 400 }}>
                <h2>📺 Podgląd</h2>
                <div style={{
                    background: "#000",
                    width: "100%",
                    aspectRatio: "16/9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative"
                }}>
                    <video
                        ref={videoRef}
                        src={activeVideoClip ? activeVideoClip.videoUrl : ""}
                        muted
                        style={{
                            width: "100%",
                            height: "100%",
                            transition: "opacity 0.3s"
                        }}
                    />
                    <audio
                        ref={audioRef}
                        src={activeAudioClip ? activeAudioClip.audioUrl : ""}
                    />
                    {!activeVideoClip && (
                        <div style={{
                            position: "absolute",
                            color: "#888",
                            fontSize: 18
                        }}>
                            Brak aktywnego klipu
                        </div>
                    )}
                </div>
                <div style={{ marginTop: 10, color: "#666", fontSize: 14 }}>
                    💡 Kliknij i przeciągnij na timeline aby przesunąć playhead<br/>
                    🔍 Scroll kółkiem myszy nad timeline'm aby zoom (Ctrl+scroll = szybszy)<br/>
                    🎬 Video na zielono, Audio na fioletowo<br/>
                    🔗 Klipy połączone: przesuwaj razem | Rozłączone: edytuj osobno<br/>
                    🧲 Magnes: automatycznie przykleja klipy do siebie i playhead'a
                </div>
            </div>
        </div>
    );
};

export default Timeline;