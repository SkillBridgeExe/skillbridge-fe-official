import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CheckoutErrorBoundaryProps {
  children: ReactNode;
  checkoutUrl: string | null;
  title: string;
  description: string;
  openPaymentLabel: string;
  resetKey?: string;
  onError?: (error: Error) => void;
}

interface CheckoutErrorBoundaryState {
  error: Error | null;
}

export class CheckoutErrorBoundary extends Component<
  CheckoutErrorBoundaryProps,
  CheckoutErrorBoundaryState
> {
  state: CheckoutErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): CheckoutErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError?.(error);
  }

  componentDidUpdate(previousProps: CheckoutErrorBoundaryProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        className="flex min-h-[320px] w-full flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-950"
      >
        <AlertCircle aria-hidden="true" className="h-10 w-10 text-amber-600" />
        <h3 className="mt-4 font-poppins text-xl font-black">{this.props.title}</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-amber-900/80">
          {this.props.description}
        </p>
        {this.props.checkoutUrl ? (
          <Button asChild className="mt-5 min-h-11 w-full rounded-xl font-bold sm:w-auto">
            <a href={this.props.checkoutUrl}>
              <ExternalLink aria-hidden="true" className="mr-2 h-4 w-4" />
              {this.props.openPaymentLabel}
            </a>
          </Button>
        ) : null}
      </div>
    );
  }
}
