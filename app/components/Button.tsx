import { forwardRef, type ButtonHTMLAttributes, type AnchorHTMLAttributes } from "react";
import { Link, type LinkProps } from "@remix-run/react";
import { Loader } from "./icons";

type ButtonVariant = "primary" | "secondary" | "accent" | "success" | "danger" | "ghost" | "outline";
type ButtonSize = "small" | "default" | "large" | "icon";

interface BaseButtonProps {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Whether the button is in a loading state */
  isLoading?: boolean;
  /** Icon to display before the text */
  leftIcon?: React.ReactNode;
  /** Icon to display after the text */
  rightIcon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Button content */
  children?: React.ReactNode;
}

type ButtonAsButton = BaseButtonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseButtonProps> & {
    as?: "button";
  };

type ButtonAsLink = BaseButtonProps &
  Omit<LinkProps, keyof BaseButtonProps> & {
    as: "link";
    to: string;
  };

type ButtonAsAnchor = BaseButtonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseButtonProps> & {
    as: "a";
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink | ButtonAsAnchor;

function getButtonClasses({
  variant = "primary",
  size = "default",
  className = "",
  isLoading = false,
}: Pick<BaseButtonProps, "variant" | "size" | "className" | "isLoading">): string {
  const baseClass = "btn";
  const variantClass = `btn-${variant}`;
  const sizeClass = size !== "default" ? `btn-${size}` : "";
  const loadingClass = isLoading ? "opacity-70 cursor-wait" : "";

  return [baseClass, variantClass, sizeClass, loadingClass, className]
    .filter(Boolean)
    .join(" ");
}

/**
 * A polymorphic button component that renders as a button, Link, or anchor.
 * Uses the existing CSS button system from global.css.
 *
 * @example
 * // Basic button
 * <Button variant="primary">Click me</Button>
 *
 * // Link button
 * <Button as="link" to="/admin" variant="secondary">Go to Admin</Button>
 *
 * // With icons
 * <Button leftIcon={<PlusIcon />}>Add Item</Button>
 *
 * // Loading state
 * <Button isLoading>Saving...</Button>
 */
export const Button = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
>(function Button(props, ref) {
  const {
    variant = "primary",
    size = "default",
    isLoading = false,
    leftIcon,
    rightIcon,
    className = "",
    children,
    ...rest
  } = props;

  const classes = getButtonClasses({ variant, size, className, isLoading });

  const content = (
    <>
      {isLoading && <Loader size={16} className="-ml-1 mr-2" />}
      {!isLoading && leftIcon}
      {children}
      {rightIcon}
    </>
  );

  if ("as" in rest && rest.as === "link") {
    const { as: _, to, ...linkProps } = rest as ButtonAsLink;
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        to={to}
        className={classes}
        {...linkProps}
      >
        {content}
      </Link>
    );
  }

  if ("as" in rest && rest.as === "a") {
    const { as: _, href, ...anchorProps } = rest as ButtonAsAnchor;
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={classes}
        {...anchorProps}
      >
        {content}
      </a>
    );
  }

  const { as: _, type, ...otherButtonProps } = rest as ButtonAsButton & { as?: "button"; type?: "button" | "submit" | "reset" };
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type || "button"}
      className={classes}
      disabled={isLoading || otherButtonProps.disabled}
      {...otherButtonProps}
    >
      {content}
    </button>
  );
});

/**
 * Icon-only button for actions like close, edit, delete.
 */
export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** The icon to display */
  icon: React.ReactNode;
  /** Accessible label for screen readers */
  "aria-label": string;
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: "small" | "default";
  /** Additional CSS classes */
  className?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ icon, variant = "ghost", size = "default", className = "", ...props }, ref) {
    const sizeClasses = {
      small: "p-1.5 min-w-[2rem] min-h-[2rem]",
      default: "p-2 min-w-[2.5rem] min-h-[2.5rem]",
    };

    return (
      <button
        ref={ref}
        type="button"
        className={`btn btn-${variant} btn-icon ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

// Re-export commonly used icons from the centralized icon system
// Import from ~/components/icons instead for the full icon set
export {
  Close,
  Plus,
  Edit,
  Trash,
  ChevronRight,
  ChevronLeft,
  Download,
  Copy,
  RefreshCw as Refresh,
  ExternalLink,
} from "./icons";
