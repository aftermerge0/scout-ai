function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export const env = {
  get DATABASE_URL() {
    return required("DATABASE_URL");
  },
  get AZURE_RESOURCE_NAME() {
    return required("AZURE_RESOURCE_NAME");
  },
  get AZURE_API_KEY() {
    return required("AZURE_API_KEY");
  },
  get AZURE_DEPLOYMENT_NAME() {
    return required("AZURE_DEPLOYMENT_NAME");
  },
};
