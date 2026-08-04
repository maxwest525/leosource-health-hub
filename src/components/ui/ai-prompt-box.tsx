import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Paperclip, Mic, StopCircle, X, FileText, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Composer bar for the AI walkthrough. Colors come from the surrounding theme
 * tokens so it inherits the scoped `quote-console` palette instead of the
 * original hard-coded dark greys.
 */

interface PromptInputBoxProps {
  onSend?: (message: string, files?: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Show the image attachment control. */
  allowAttachments?: boolean;
  /** Show the microphone control when the field is empty. */
  allowVoice?: boolean;
  maxHeight?: number;
}

const composerActionButton =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors";

const isImageFile = (file: File) => file.type.startsWith("image/");

const ACCEPTED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const isAcceptedFile = (file: File) =>
  isImageFile(file) || ACCEPTED_DOC_TYPES.includes(file.type);

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

interface VoiceRecorderProps {
  isRecording: boolean;
  onStopRecording: (duration: number) => void;
  visualizerBars?: number;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  isRecording,
  onStopRecording,
  visualizerBars = 28,
}) => {
  const [time, setTime] = React.useState(0);
  const timeRef = React.useRef(0);

  React.useEffect(() => {
    timeRef.current = time;
  }, [time]);

  React.useEffect(() => {
    if (!isRecording) return;
    setTime(0);
    const timer = window.setInterval(() => setTime((value) => value + 1), 1000);
    return () => {
      window.clearInterval(timer);
      onStopRecording(timeRef.current);
    };
  }, [isRecording, onStopRecording]);

  if (!isRecording) return null;

  return (
    <div className="flex w-full flex-col items-center justify-center py-3">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
        <span className="text-sm tabular-nums text-muted-foreground">{formatTime(time)}</span>
      </div>
      <div className="flex h-10 w-full items-center justify-center gap-0.5 px-4">
        {Array.from({ length: visualizerBars }).map((_, index) => (
          <span
            key={index}
            className="w-0.5 animate-pulse rounded-full bg-primary/50"
            style={{
              height: `${Math.max(15, ((index * 37) % 100))}%`,
              animationDelay: `${index * 0.05}s`,
              animationDuration: `${0.6 + ((index % 5) * 0.1)}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

const ImageViewDialog: React.FC<{ imageUrl: string | null; onClose: () => void }> = ({
  imageUrl,
  onClose,
}) => {
  if (!imageUrl) return null;
  return (
    <Dialog open={!!imageUrl} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] border-border bg-card p-2 md:max-w-2xl">
        <DialogTitle className="sr-only">Image preview</DialogTitle>
        <img src={imageUrl} alt="Attachment preview" className="max-h-[70vh] w-full rounded-xl object-contain" />
      </DialogContent>
    </Dialog>
  );
};

export const PromptInputBox = React.forwardRef<HTMLDivElement, PromptInputBoxProps>((props, ref) => {
  const {
    onSend = () => {},
    isLoading = false,
    placeholder = "Type your answer...",
    className,
    disabled = false,
    allowAttachments = false,
    allowVoice = false,
    maxHeight,
  } = props;

  const [input, setInput] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [previews, setPreviews] = React.useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  // Cap the field against the *visible* viewport so an open mobile keyboard
  // never pushes the growing textarea past the edge of the screen.
  const [viewportHeight, setViewportHeight] = React.useState(() =>
    typeof window === "undefined" ? 800 : window.visualViewport?.height ?? window.innerHeight,
  );
  const uploadInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const update = () =>
      setViewportHeight(window.visualViewport?.height ?? window.innerHeight);
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  const resolvedMaxHeight =
    maxHeight ?? Math.max(72, Math.min(200, Math.round(viewportHeight * 0.28)));

  // Measure the natural content height, then animate the field to it so growth
  // and shrink glide instead of snapping (important with a mobile keyboard up).
  const [fieldHeight, setFieldHeight] = React.useState<number>(36);

  React.useLayoutEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    const previous = node.style.height;
    node.style.height = "auto";
    const natural = node.scrollHeight;
    node.style.height = previous;
    setFieldHeight(Math.max(36, Math.min(natural, resolvedMaxHeight)));
    node.style.overflowY = natural > resolvedMaxHeight ? "auto" : "hidden";
  }, [input, resolvedMaxHeight, isRecording, files.length]);



  const processFile = React.useCallback((file: File) => {
    if (!isAcceptedFile(file) || file.size > 10 * 1024 * 1024) return;
    setFiles([file]);
    if (!isImageFile(file)) {
      setPreviews({});
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => setPreviews({ [file.name]: event.target?.result as string });
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = React.useCallback(
    (event: React.DragEvent) => {
      if (!allowAttachments) return;
      event.preventDefault();
      const dropped = Array.from(event.dataTransfer.files).filter(isAcceptedFile);
      if (dropped.length > 0) processFile(dropped[0]);
    },
    [allowAttachments, processFile],
  );

  const handleSubmit = () => {
    if (isLoading || disabled) return;
    if (!input.trim() && files.length === 0) return;
    onSend(input.trim(), files);
    setInput("");
    setFiles([]);
    setPreviews({});
  };

  const handleStopRecording = React.useCallback(
    (duration: number) => {
      if (duration > 0) onSend(`[Voice message - ${duration} seconds]`, []);
    },
    [onSend],
  );

  const hasContent = input.trim() !== "" || files.length > 0;
  const busy = isLoading;

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("relative w-full", className)}>
        <div
          ref={ref}
          onDragOver={(event) => allowAttachments && event.preventDefault()}
          onDrop={handleDrop}
          className={cn(
            "relative overflow-hidden rounded-[20px] border border-primary/20 bg-card/70 p-2.5 backdrop-blur-xl transition-colors focus-within:border-primary/60 sm:p-3",

            isRecording && "border-destructive/60",
          )}
        >
          {busy && (
            <motion.span
              aria-hidden
              className="absolute inset-x-0 top-0 h-px w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent"
              animate={{ x: ["-100%", "320%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          <AnimatePresence>
            {files.length > 0 && !isRecording && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2 pb-2"
              >
                {files.map((file) => (
                  <div key={file.name} className="relative">
                    {previews[file.name] ? (
                      <button
                        type="button"
                        onClick={() => setSelectedImage(previews[file.name])}
                        className="block h-16 w-16 overflow-hidden rounded-xl border border-border"
                      >
                        <img src={previews[file.name]} alt={file.name} className="h-full w-full object-cover" />
                      </button>
                    ) : (
                      <div className="flex h-16 max-w-[220px] items-center gap-2 rounded-xl border border-border bg-background/60 py-2 pl-3 pr-8">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate text-xs text-foreground" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => {
                        setFiles([]);
                        setPreviews({});
                      }}
                      className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background/80 text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {isRecording ? (
            <VoiceRecorder isRecording={isRecording} onStopRecording={handleStopRecording} />
          ) : (
            <motion.textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={placeholder}
              enterKeyHint="send"
              autoComplete="off"
              aria-label="Message the quote walkthrough"
              disabled={disabled}
              initial={false}
              animate={{ height: fieldHeight }}
              transition={{ type: "spring", stiffness: 340, damping: 34, mass: 0.6 }}
              style={{ maxHeight: resolvedMaxHeight }}
              className="flex min-h-[36px] w-full resize-none overflow-hidden border-none bg-transparent px-1 py-1.5 text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:opacity-50 md:text-[15px]"
            />

          )}

          <div className="flex items-center justify-between gap-2 px-0 pt-2">
            <div className="flex items-center gap-2">

              {allowAttachments && !isRecording && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      aria-label="Upload a document or photo"
                      className={cn(composerActionButton, "border-border/60 text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-foreground")}
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Attach a document or photo</TooltipContent>
                </Tooltip>
              )}
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*,application/pdf,.doc,.docx"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) processFile(file);
                  event.target.value = "";
                }}
              />
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 380, damping: 26 }}
                  onClick={() => {
                    if (isRecording) setIsRecording(false);
                    else if (hasContent || !allowVoice) handleSubmit();
                    else setIsRecording(true);
                  }}
                  disabled={disabled || (busy && !isRecording)}
                  aria-label={isRecording ? "Stop recording" : hasContent || !allowVoice ? "Send message" : "Voice message"}
                  className={cn(
                    composerActionButton,
                    "relative disabled:opacity-50",
                    isRecording
                      ? "border-destructive/50 text-destructive"
                      : "border-primary/40 text-primary hover:bg-primary/10",
                  )}
                >
                  {busy && (
                    <motion.span
                      aria-hidden
                      className="pointer-events-none absolute -inset-[3px] rounded-full"
                      style={{
                        background:
                          "conic-gradient(from 0deg, transparent 0deg, hsl(var(--primary)/0.9) 90deg, transparent 200deg)",
                        WebkitMask:
                          "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))",
                        mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))",
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                  {busy ? (
                    <motion.span
                      className="inline-flex"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="h-4 w-4" />
                    </motion.span>
                  ) : isRecording ? (
                    <StopCircle className="h-4 w-4" />
                  ) : hasContent || !allowVoice ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}


                </motion.button>
              </TooltipTrigger>
              <TooltipContent>
                {isRecording ? "Stop recording" : hasContent || !allowVoice ? "Send message" : "Voice message"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <ImageViewDialog imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      </div>
    </TooltipProvider>
  );
});
PromptInputBox.displayName = "PromptInputBox";
