"use client";

import type { ReactNode } from "react";
import { useWatch, type FieldValues, type UseFormReturn } from "react-hook-form";

import {
  FormAsyncCombobox,
  FormCheckbox,
  FormCombobox,
  FormDatePicker,
  FormDateRange,
  FormGrid,
  FormInput,
  FormMultiSelect,
  FormRadioGroup,
  FormSection,
  FormSelect,
  FormSwitch,
  FormTextarea,
} from "@/components/forms";

import type { ResourceFormField } from "./resource.types";

/**
 * Renders a configuration-driven form body (Mode 1).
 *
 * This exists because roughly half of business forms really are "a grid of
 * labelled inputs", and writing that grid by hand fifteen times is the
 * boilerplate this framework is meant to remove.
 *
 * It stops well short of describing every possible control. Anything it cannot
 * express uses `type: "custom"` for one field, or a custom form component for
 * the whole form — see `ResourceFormProps`.
 */
export function ResourceFormFields<TFormValues extends FieldValues>({
  form,
  fields,
  columns = 2,
  disabled = false,
}: {
  form: UseFormReturn<TFormValues>;
  fields: ResourceFormField<TFormValues>[];
  columns?: 1 | 2 | 3;
  disabled?: boolean;
}) {
  // Subscribing once here keeps conditional `visible`/`disabled` predicates
  // working without every field creating its own watcher.
  const values = useWatch({ control: form.control }) as TFormValues;

  const sections = fields.filter((field) => field.type === "section");
  const flat = fields.filter((field) => field.type !== "section");

  return (
    <div className="space-y-8">
      {flat.length > 0 ? (
        <FormGrid columns={columns}>
          {flat.map((field) => (
            <FieldRenderer
              key={fieldKey(field)}
              field={field}
              form={form}
              values={values}
              disabled={disabled}
            />
          ))}
        </FormGrid>
      ) : null}

      {sections.map((section) =>
        section.type === "section" ? (
          <FormSection key={section.title} title={section.title} description={section.description}>
            <FormGrid columns={columns}>
              {section.fields.map((field) => (
                <FieldRenderer
                  key={fieldKey(field)}
                  field={field}
                  form={form}
                  values={values}
                  disabled={disabled}
                />
              ))}
            </FormGrid>
          </FormSection>
        ) : null,
      )}
    </div>
  );
}

function fieldKey<TFormValues extends FieldValues>(field: ResourceFormField<TFormValues>): string {
  return field.type === "section" ? `section:${field.title}` : String(field.name);
}

function FieldRenderer<TFormValues extends FieldValues>({
  field,
  form,
  values,
  disabled,
}: {
  field: ResourceFormField<TFormValues>;
  form: UseFormReturn<TFormValues>;
  values: TFormValues;
  disabled: boolean;
}): ReactNode {
  if (field.type === "section") return null;
  if (field.visible && !field.visible(values)) return null;

  const isDisabled =
    disabled ||
    (field.type !== "custom" &&
      (typeof field.disabled === "function" ? field.disabled(values) : Boolean(field.disabled)));

  const wrapperClass = field.fullWidth ? "sm:col-span-2 lg:col-span-3" : undefined;

  const control = form.control;

  switch (field.type) {
    case "text":
    case "email":
    case "password":
    case "tel":
    case "url":
    case "number":
      return (
        <FormInput
          control={control}
          name={field.name}
          type={field.type}
          label={field.label}
          description={field.description}
          placeholder={field.placeholder}
          required={field.required}
          autoComplete={field.autoComplete}
          disabled={isDisabled}
          className={wrapperClass}
        />
      );

    case "textarea":
      return (
        <FormTextarea
          control={control}
          name={field.name}
          label={field.label}
          description={field.description}
          placeholder={field.placeholder}
          required={field.required}
          rows={field.rows}
          disabled={isDisabled}
          className={wrapperClass ?? "sm:col-span-2 lg:col-span-3"}
        />
      );

    case "select":
      return (
        <FormSelect
          control={control}
          name={field.name}
          label={field.label}
          description={field.description}
          options={field.options}
          placeholder={field.placeholder}
          required={field.required}
          disabled={isDisabled}
          className={wrapperClass}
        />
      );

    case "combobox":
      return (
        <FormCombobox
          control={control}
          name={field.name}
          label={field.label}
          description={field.description}
          options={field.options}
          placeholder={field.placeholder}
          required={field.required}
          disabled={isDisabled}
          className={wrapperClass}
        />
      );

    case "radio":
      return (
        <FormRadioGroup
          control={control}
          name={field.name}
          label={field.label}
          description={field.description}
          options={field.options}
          required={field.required}
          disabled={isDisabled}
          className={wrapperClass}
        />
      );

    case "multi-select":
      return (
        <FormMultiSelect
          control={control}
          name={field.name}
          label={field.label}
          description={field.description}
          options={field.options}
          placeholder={field.placeholder}
          required={field.required}
          disabled={isDisabled}
          className={wrapperClass}
        />
      );

    case "checkbox":
      return (
        <FormCheckbox
          control={control}
          name={field.name}
          label={field.label}
          description={field.description}
          disabled={isDisabled}
          className={wrapperClass}
        />
      );

    case "switch":
      return (
        <FormSwitch
          control={control}
          name={field.name}
          label={field.label}
          description={field.description}
          disabled={isDisabled}
          className={wrapperClass}
        />
      );

    case "date":
      return (
        <FormDatePicker
          control={control}
          name={field.name}
          label={field.label}
          description={field.description}
          placeholder={field.placeholder}
          required={field.required}
          disabled={isDisabled}
          className={wrapperClass}
        />
      );

    case "date-range":
      return (
        <FormDateRange
          control={control}
          name={field.name}
          label={field.label}
          description={field.description}
          placeholder={field.placeholder}
          required={field.required}
          disabled={isDisabled}
          className={wrapperClass}
        />
      );

    case "async-combobox":
      return (
        <FormAsyncCombobox
          control={control}
          name={field.name}
          label={field.label}
          description={field.description}
          queryKey={field.queryKey}
          loadOptions={field.loadOptions}
          loadSelected={field.loadSelected}
          placeholder={field.placeholder}
          required={field.required}
          disabled={isDisabled}
          className={wrapperClass}
        />
      );

    case "custom":
      return <div className={wrapperClass}>{field.render(form)}</div>;
  }
}
