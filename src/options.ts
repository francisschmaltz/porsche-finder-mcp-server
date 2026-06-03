export type OptionItem = {
  value: string;
  label: string;
};

export const CATEGORY_OPTIONS: OptionItem[] = [
  { value: "911-carrera-coupe", label: "911 Carrera Coupe" },
  { value: "911-carrera-t", label: "911 Carrera T" },
  { value: "911-carrera-4-coupe", label: "911 Carrera 4 Coupe" },
  { value: "911-carrera-s-coupe", label: "911 Carrera S Coupe" },
  { value: "911-carrera-4s-coupe", label: "911 Carrera 4S Coupe" },
  { value: "911-carrera-gts-coupe", label: "911 Carrera GTS Coupe" },
  { value: "911-carrera-4-gts-coupe", label: "911 Carrera 4 GTS Coupe" },
  { value: "911-carrera-convertible", label: "911 Carrera Cabriolet" },
  { value: "911-carrera-t-cabriolet", label: "911 Carrera T Cabriolet" },
  { value: "911-carrera-4-convertible", label: "911 Carrera 4 Cabriolet" },
  { value: "911-carrera-s-convertible", label: "911 Carrera S Cabriolet" },
  { value: "911-carrera-4s-convertible", label: "911 Carrera 4S Cabriolet" },
  { value: "911-carrera-gts-convertible", label: "911 Carrera GTS Cabriolet" },
  { value: "911-carrera-4-gts-convertible", label: "911 Carrera 4 GTS Cabriolet" },
  { value: "911-sc-convertible", label: "911 SC Cabriolet" },
  { value: "911-targa", label: "911 Targa" },
  { value: "911-targa-4", label: "911 Targa 4" },
  { value: "911-targa-4s", label: "911 Targa 4S" },
  { value: "911-targa-4-gts", label: "911 Targa 4 GTS" },
  { value: "911-sc-targa", label: "911 SC Targa" },
  { value: "911-carrera-targa", label: "911 Carrera Targa" },
  { value: "911-carrera-4-targa", label: "911 Carrera 4 Targa" },
  { value: "911-turbo-coupe", label: "911 Turbo Coupe" },
  { value: "911-turbo-s-coupe", label: "911 Turbo S Coupe" },
  { value: "911-turbo-convertible", label: "911 Turbo Cabriolet" },
  { value: "911-turbo-s-convertible", label: "911 Turbo S Cabriolet" },
  { value: "911-turbo-930-33-targa", label: "911 Turbo 930 3.3 Targa" }
];

export const MODEL_GENERATION_OPTIONS: OptionItem[] = [
  { value: "992", label: "992.1" },
  { value: "992-2", label: "992.2" },
  { value: "991-2", label: "991.2" },
  { value: "991-1", label: "991.1" }
];

export const EQUIPMENT_OPTIONS: OptionItem[] = [
  { value: "sport-chrono-package", label: "Sport Chrono Package" },
  { value: "premium-package", label: "Premium Package" },
  { value: "bose-sound-system", label: "BOSE Surround Sound System" },
  { value: "sunroof", label: "Sunroof" },
  { value: "parkassist-incl-surround-view", label: "ParkAssist incl. Surround View" }
];

export const VALID_CATEGORIES = new Set(CATEGORY_OPTIONS.map((item) => item.value));
export const VALID_MODEL_GENERATIONS = new Set(MODEL_GENERATION_OPTIONS.map((item) => item.value));
export const VALID_EQUIPMENT = new Set(EQUIPMENT_OPTIONS.map((item) => item.value));
