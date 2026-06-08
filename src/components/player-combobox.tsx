"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { type KeyboardEvent, useId, useMemo, useRef, useState } from "react";

import { cx } from "@/lib/format";
import { filterPlayerComboboxOptions, type PlayerComboboxOption } from "@/lib/player-combobox";

type PlayerComboboxProps = {
  options: PlayerComboboxOption[];
  label: string;
  placeholder: string;
  emptyLabel?: string;
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

type PlayerComboboxRow = PlayerComboboxOption & {
  empty?: boolean;
};

export function PlayerCombobox({
  options,
  label,
  placeholder,
  emptyLabel,
  id,
  name,
  value,
  defaultValue = "",
  onChange,
  required = false,
  disabled = false,
  className,
}: PlayerComboboxProps) {
  const generatedId = useId().replace(/:/g, "");
  const inputId = id ?? `player-combobox-${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const selectedValue = isControlled ? value : internalValue;
  const selectedOption = options.find((option) => option.value === selectedValue) ?? null;
  const filteredOptions = useMemo(() => filterPlayerComboboxOptions(options, query), [options, query]);
  const rows = useMemo(() => playerComboboxRows(filteredOptions, query, emptyLabel), [emptyLabel, filteredOptions, query]);
  const activeId = open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;
  const inputValue = open ? query : selectedOption ? playerDisplayLabel(selectedOption) : "";

  function openPicker() {
    if (disabled) return;
    const nextQuery = "";
    const nextRows = playerComboboxRows(filterPlayerComboboxOptions(options, nextQuery), nextQuery, emptyLabel);
    setActiveIndex(activeIndexForRows(nextRows, selectedValue));
    setQuery(nextQuery);
    setOpen(true);
  }

  function closePicker() {
    setOpen(false);
    setQuery("");
  }

  function commitValue(nextValue: string) {
    if (!isControlled) setInternalValue(nextValue);
    onChange?.(nextValue);
    closePicker();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        openPicker();
        return;
      }
      setActiveIndex((index) => (rows.length ? (index + 1 + rows.length) % rows.length : -1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openPicker();
        return;
      }
      setActiveIndex((index) => (rows.length ? (index - 1 + rows.length) % rows.length : -1));
      return;
    }

    if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(rows.length ? 0 : -1);
      return;
    }

    if (event.key === "End" && open) {
      event.preventDefault();
      setActiveIndex(rows.length ? rows.length - 1 : -1);
      return;
    }

    if (event.key === "Enter" && open && activeIndex >= 0) {
      event.preventDefault();
      const row = rows[activeIndex];
      if (row && !row.disabled) commitValue(row.value);
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      closePicker();
      return;
    }

    if (event.key === "Tab") closePicker();
  }

  return (
    <div
      ref={rootRef}
      className={cx("player-combobox", open && "player-combobox-open", disabled && "player-combobox-disabled", className)}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget instanceof Node ? event.relatedTarget : null;
        if (!event.currentTarget.contains(nextTarget)) closePicker();
      }}
    >
      <label className="player-combobox-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="player-combobox-control">
        <Search className="player-combobox-search-icon" aria-hidden="true" size={16} />
        <input
          ref={inputRef}
          id={inputId}
          className="player-combobox-input"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-activedescendant={activeId}
          aria-required={required}
          autoComplete="off"
          disabled={disabled}
          placeholder={open ? "Søk spiller" : placeholder}
          value={inputValue}
          onChange={(event) => {
            const nextQuery = event.target.value;
            const nextRows = playerComboboxRows(filterPlayerComboboxOptions(options, nextQuery), nextQuery, emptyLabel);
            setActiveIndex(activeIndexForRows(nextRows, selectedValue));
            setQuery(nextQuery);
            setOpen(true);
          }}
          onFocus={openPicker}
          onKeyDown={handleKeyDown}
        />
        {selectedValue && !required ? (
          <button
            type="button"
            className="player-combobox-icon-button"
            aria-label="Tøm spillervalg"
            disabled={disabled}
            onClick={() => commitValue("")}
          >
            <X size={16} aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          className="player-combobox-icon-button"
          aria-label={open ? "Lukk spillervalg" : "Åpne spillervalg"}
          aria-controls={listboxId}
          aria-expanded={open}
          disabled={disabled}
          onClick={() => (open ? closePicker() : openPicker())}
        >
          <ChevronDown size={17} aria-hidden="true" />
        </button>
      </div>
      {name ? <input type="hidden" name={name} value={selectedValue} /> : null}
      {open ? (
        <div className="player-combobox-menu" id={listboxId} role="listbox" aria-label={label}>
          {rows.length ? (
            <PlayerComboboxRows rows={rows} activeIndex={activeIndex} selectedValue={selectedValue} listboxId={listboxId} onSelect={commitValue} />
          ) : (
            <div className="player-combobox-empty" role="status">
              Ingen spillere funnet
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function PlayerComboboxRows({
  rows,
  activeIndex,
  selectedValue,
  listboxId,
  onSelect,
}: {
  rows: PlayerComboboxRow[];
  activeIndex: number;
  selectedValue: string;
  listboxId: string;
  onSelect: (value: string) => void;
}) {
  let previousGroup = "";

  return rows.map((row, index) => {
    const showGroup = !row.empty && row.groupLabel && row.groupLabel !== previousGroup;
    previousGroup = row.groupLabel ?? "";

    return (
      <div key={`${row.value || "empty"}-${index}`}>
        {showGroup ? <div className="player-combobox-group">{row.groupLabel}</div> : null}
        <button
          id={`${listboxId}-option-${index}`}
          type="button"
          role="option"
          aria-selected={row.value === selectedValue}
          className={cx(
            "player-combobox-option",
            index === activeIndex && "player-combobox-option-active",
            row.value === selectedValue && "player-combobox-option-selected",
            row.empty && "player-combobox-option-empty",
          )}
          disabled={row.disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(row.value)}
        >
          <span className="player-combobox-option-main">
            <span>{row.label}</span>
            {row.meta ? <small>{row.meta}</small> : null}
          </span>
          {row.value === selectedValue ? <Check size={16} aria-hidden="true" /> : null}
        </button>
      </div>
    );
  });
}

function playerComboboxRows(options: PlayerComboboxOption[], query: string, emptyLabel?: string): PlayerComboboxRow[] {
  const optionRows = options.map((option) => ({ ...option, empty: false }));
  if (!emptyLabel || query.trim()) return optionRows;
  return [{ value: "", label: emptyLabel, empty: true }, ...optionRows];
}

function activeIndexForRows(rows: PlayerComboboxRow[], selectedValue: string) {
  const selectedIndex = rows.findIndex((row) => row.value === selectedValue);
  return selectedIndex >= 0 ? selectedIndex : rows.length ? 0 : -1;
}

function playerDisplayLabel(option: PlayerComboboxOption) {
  return option.meta ? `${option.label} · ${option.meta}` : option.label;
}
