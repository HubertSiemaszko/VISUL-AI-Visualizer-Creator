export type ClipType = {
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

export type DragAction = "move" | "resize-left" | "resize-right";

export type DragState = {
    clipId: string;
    originalStart: number;
    originalDuration: number;
    originalTrack: number;
    action: DragAction;
    startX: number;
    startY: number;
};