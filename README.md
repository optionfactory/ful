## Getting started
- Import the lib via CDN: 

```html
<script src="https://cdn.jsdelivr.net/npm/@optionfactory/ful@{VERSION}/dist/ful.iife.min.js" integrity="sha384-{INTEGRITY}" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
```

```html
<script src="https://cdn.jsdelivr.net/npm/@optionfactory/ful@{VERSION}/dist/ful-client-errors.iife.min.js" integrity="sha384-{INTEGRITY}" crossorigin="anonymous" referrerpolicy="no-referrer"></script>

```
## 🧱 Elements
### 📊 `<ful-table>` :

It allows you to display and interact with paginated, sortable, and filterable data

### ⚙️ Attributes
| Attribute | Type | Description |
|------------|------|-------------|
| `src` | `string` | The API endpoint to fetch data from. |
| `method` | `string` | HTTP method to use . Default: `GET`. |
| `autoload` | `boolean` | Automatically loads data when the component is mounted. |
| `page-size` | `number` | Number of items per page. |
| `loader` | `string` | Optional custom loader (default: `loaders:table`). |
---
### 🧩 Structure
- **`<schema>`** — defines the columns and how data is rendered.
  Each `<column>` can have:
  - `title`: Column header label
  - `sorter`: Field name for sorting
  - `order`: Initial order (`asc` or `desc`)
### 💡 Example
```html
<ful-table src="/api/users/" autoload page-size="5">
  <schema>
    <column title="ID" sorter="id" order="asc">{{ id }}</column>
    <column title="Name" sorter="name">{{ name }}</column>
    <column title="Email">{{ email }}</column>
  </schema>
</ful-table>
```
* Loads user data from `/api/users/`
* Displays a paginated, sortable table
* Allows searching by name via the filter input
* Requires no additional JavaScript


## 🧮 Filters

Filters are placed inside a container with the slot `filters` : `<div slot="filters">` , and are sent automatically with the table request.

Each filter returns a structured value automatically :

| Filter                    | Example Value                             |
| ------------------------- | ----------------------------------------- |
| `<ful-filter-text>`       | `["CONTAINS", "IGNORE_CASE", "mario"]`    |
| `<ful-filter-local-date>` | `["BETWEEN", "2024-01-01", "2024-12-31"]` |
| `<ful-filter-instant>`    | `["GTE", "2024-03-12T08:00:00.000Z"]`     |

---


### ✨ Available Filters

| Filter Tag                |                                              | Input Type     | Operators                                        |
| ------------------------- | ------------------------------------------------------- | -------------- | ------------------------------------------------ |
| `<ful-filter-text>`       | | text           | `CONTAINS`, `STARTS_WITH`, `ENDS_WITH`, `EQ`     |
| `<ful-filter-local-date>` |                                       | date           | `EQ`, `NEQ`, `LT`, `GT`, `LTE`, `GTE`, `BETWEEN` |
| `<ful-filter-instant>`    |                                        | datetime-local | same as `LocalDate`                              |

---



### 💡 Example

```html
<ful-table src="/your_api/" autoload page-size="10">
  <div slot="filters" class="row mb-3">
    <ful-filter-text class="col" name="byName">Nome</ful-filter-text>
    <ful-filter-instant class="col" name="byCreatedAt">Data</ful-filter-instant>
    <div class="col-auto align-content-end">
      <button type="submit" class="btn btn-primary">
        <i class="bi bi-search"></i>
      </button>
    </div>
  </div>

  <schema>
    <column title="Nome" sorter="byName">{{ name }}</column>
    <column title="Email">{{ email }}</column>
    <column title="Data">{{ createdAt }}</column>
  </schema>
</ful-table>
```

### ⚙️ Filter Attributes

| Attribute    | Type           | Description                                                     |
| ------------ | -------------- | --------------------------------------------------------------- |
| `name`       | `string`       | Parameter name sent with the request 
| `value`      | `array` (JSON) | Sets an initial operator and value.                             

---

### ⚙️ Backend Integration

Filters work seamlessly with the backend using
`net.optionfactory.spring.data.jpa.filtering.filters`.

> 📝 **Note:**
>  **Annotate the fields in your entity** with the appropriate filter annotations (e.g. `@InstantCompare`, `@LocalDateCompare`, `@TextCompare`).
> The values sent from `<ful-table>` are automatically matched and processed by the backend.