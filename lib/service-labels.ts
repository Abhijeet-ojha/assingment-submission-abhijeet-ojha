export const serviceLabels = {
  SERVICE_1: 'Service 1',
  SERVICE_2: 'Service 2',
  SERVICE_3: 'Service 3'
} as const;

export type ServiceCode = keyof typeof serviceLabels;

export const serviceOptions = Object.entries(serviceLabels).map(([value, label]) => ({ value, label }));
