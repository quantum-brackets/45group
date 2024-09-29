import { Dialog, IconButton, IconButtonProps, DialogProps } from "@mui/material";
import { IoClose } from "react-icons/io5";
import { cn } from "~/utils/helpers";

type Props = DialogProps & {
  exitIcon?: IconButtonProps & {
    display: boolean;
  };
};

export default function Modal({ children, exitIcon, ...props }: Props) {
  const { display, ...iconButtonProps } = exitIcon || {};

  return (
    <Dialog {...props}>
      {display && (
        <IconButton
          {...iconButtonProps}
          className={cn(
            `mediumMobile::right-2 mediumMobile::top-2 !absolute right-[16px] top-[12px]`,
            exitIcon?.className
          )}
          onClick={props.onClose as () => void}
          size="small"
        >
          <IoClose />
        </IconButton>
      )}
      {children}
    </Dialog>
  );
}
