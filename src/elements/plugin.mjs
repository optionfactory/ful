import { Checkbox } from "./checkbox.mjs";
import { InstantFilter, LocalDateFilter, TextFilter } from "./filters.mjs";
import { Form } from "./form.mjs";
import { Input } from "./input.mjs";
import { RadioGroup } from "./radio.mjs";
import { Select } from "./select.mjs";
import { Spinner } from "./spinner.mjs";
import { Table } from "./table.mjs";


class Plugin {
    configure(registry) {
        registry
            .define('ful-spinner', Spinner)
            .define('ful-checkbox', Checkbox)
            .define('ful-input', Input)
            .define('ful-radio-group', RadioGroup)
            .define('ful-select', Select)
            .define('ful-form', Form)
            .define('ful-table', Table)
            .define('ful-filter-instant', InstantFilter)
            .define('ful-filter-local-date', LocalDateFilter)
            .define('ful-filter-text', TextFilter);
    }
}



export { Plugin }