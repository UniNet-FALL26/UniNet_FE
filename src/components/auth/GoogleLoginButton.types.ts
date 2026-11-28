export type GoogleLoginButtonProps = {
  disabled?: boolean;
  signup?: boolean;
  onSignIn: (getIdToken: () => Promise<string | null>) => Promise<void>;
};
