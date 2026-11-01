import { fireEvent, screen } from "@testing-library/react";

export const chooseSelectOption = (label: string, optionName: string) => {
  fireEvent.click(screen.getByRole("combobox", { name: label }));
  fireEvent.click(screen.getByRole("option", { name: optionName }));
};

export const chooseSelectOptionAt = (
  label: string,
  optionName: string,
  index: number,
) => {
  fireEvent.click(screen.getAllByRole("combobox", { name: label })[index]!);
  fireEvent.click(screen.getByRole("option", { name: optionName }));
};
