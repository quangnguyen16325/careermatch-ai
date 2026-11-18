import { useEffect, useRef, type ComponentProps } from "react";

type ModalProps = Omit<ComponentProps<"dialog">, "open" | "onClose"> & {
  onClose: () => void;
};

// Native modal dialogs provide focus containment, background inertness and
// focus restoration, including when confirmation dialogs are nested.
export function Modal({
  onClose,
  className = "",
  children,
  ...props
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, []);

  return (
    <dialog
      {...props}
      ref={ref}
      tabIndex={-1}
      className={`fixed m-auto border-0 text-inherit ${className}`}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            "button, a[href], input, select, textarea, [tabindex]",
          ),
        ).filter(
          (element) =>
            element.tabIndex >= 0 &&
            !element.matches(":disabled") &&
            element.getClientRects().length > 0,
        );
        const index = controls.indexOf(document.activeElement as HTMLElement);
        if (!controls.length) {
          event.preventDefault();
          event.currentTarget.focus();
        } else if (
          event.shiftKey
            ? index <= 0
            : index === controls.length - 1 || index < 0
        ) {
          event.preventDefault();
          controls[event.shiftKey ? controls.length - 1 : 0].focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onClick={(event) => {
        // React events from nested dialogs must not dismiss the parent overlay.
        event.stopPropagation();
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.target === event.currentTarget &&
          (event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom)
        )
          onClose();
      }}
    >
      {children}
    </dialog>
  );
}
