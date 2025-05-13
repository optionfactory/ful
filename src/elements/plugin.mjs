import { HttpClient } from "../http-client.mjs";
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
        const httpClient = HttpClient.builder()
            .withCsrfToken()
            .withRedirectOnUnauthorized("/")
            .build();


        registry
            .defineComponent('http-client', httpClient)
            .defineElement('ful-spinner', Spinner)
            .defineElement('ful-form', Form)
            .defineElement('ful-checkbox', Checkbox)
            .defineElement('ful-input', Input)
            .defineElement('ful-radio-group', RadioGroup)
            .defineElement('ful-select', Select)
            .defineElement('ful-table', Table)
            .defineElement('ful-filter-instant', InstantFilter)
            .defineElement('ful-filter-local-date', LocalDateFilter)
            .defineElement('ful-filter-text', TextFilter);
    }
}



export { Plugin }