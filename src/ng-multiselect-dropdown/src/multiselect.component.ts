import { Component, OnInit, NgModule, HostListener, OnChanges, ViewEncapsulation, forwardRef, Input, Output, EventEmitter, ElementRef, AfterViewInit, Pipe, PipeTransform } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ListItem, MyException } from './multiselect.model';
import { ClickOutsideDirective } from './click-outside.directive';
import { ListFilterPipe } from './list-filter.pipe';

export interface DropdownSettings {
    singleSelection: Boolean;
    idField?: string;
    textField?: string;
    enableCheckAll: Boolean;
    selectAllText: String;
    unSelectAllText: String;
    allowSearchFilter?: Boolean;
    maxHeight?: Number;
    itemsShowLimit: Number;
    limitSelection?: Number;
    searchPlaceholderText?: String;
    closeDropDownOnSelection?: Boolean;
    selectText: String;
    allowSelect: Boolean;
}

export const DROPDOWN_CONTROL_VALUE_ACCESSOR: any = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => MultiSelectComponent),
    multi: true
};
const noop = () => { };

@Component({
    selector: 'ng-multiselect-dropdown',
    templateUrl: './multi-select.component.html',
    styleUrls: ['./multi-select.component.scss'],
    providers: [DROPDOWN_CONTROL_VALUE_ACCESSOR]
})
export class MultiSelectComponent implements OnInit, ControlValueAccessor {
    public _settings: DropdownSettings;
    public _data: Array<ListItem> = [];
    public selectedItems: Array<ListItem> = [];
    public isDropdownOpen = false;

    filter: ListItem = new ListItem(this.data);
    select = '';
    defaultSettings: DropdownSettings = {
        singleSelection: false,
        idField: 'id',
        textField: 'text',
        enableCheckAll: true,
        selectAllText: 'Select All',
        unSelectAllText: 'UnSelect All',
        allowSearchFilter: false,
        maxHeight: 197,
        itemsShowLimit: 999999999999,
        searchPlaceholderText: 'Search',
        closeDropDownOnSelection: false,
        selectText: 'Select',
        allowSelect : true
    };

    @Input() placeholder = 'Select';
    @Input() disabled = false;

    @Input()
    public set settings(value: DropdownSettings) {
        if (value) {
            this._settings = Object.assign(this.defaultSettings, value);
        } else {
            this._settings = Object.assign(this.defaultSettings);
        }
    }

    @Input()
    public set data(value: Array<any>) {
        if (!value) {
            this._data = [];
        } else {
            const _items = value.filter((item: any) => {
                if (typeof item === 'string' || (typeof item === 'object' && item && item[this._settings.idField] && item[this._settings.textField])) {
                    return item;
                }
            });
            this._data = _items.map(
                (item: any) =>
                    typeof item === 'string'
                        ? new ListItem(item)
                        : new ListItem({
                            id: item[this._settings.idField],
                            text: item[this._settings.textField]
                        })
            );
        }
    }

    @Output('onSelect') onSelect: EventEmitter<ListItem> = new EventEmitter<any>();

    @Output('onDeSelect') onDeSelect: EventEmitter<ListItem> = new EventEmitter<any>();

    @Output('onSelectAll') onSelectAll: EventEmitter<Array<ListItem>> = new EventEmitter<Array<any>>();

    @Output('onDeSelectAll') onDeSelectAll: EventEmitter<Array<ListItem>> = new EventEmitter<Array<any>>();

    private onTouchedCallback: () => void = noop;
    private onChangeCallback: (_: any) => void = noop;

    constructor() { }
    ngOnInit() { }
    onItemClick($event: any, item: ListItem) {
        if (this.disabled) {
            return false;
        }

        const found = this.isSelected(item);
        const limit = this.selectedItems.length < this._settings.limitSelection ? true : false;

        if (!found) {
            if (this._settings.limitSelection) {
                if (limit) {
                    this.addSelected(item);
                }
            } else {
                this.addSelected(item);
            }
        } else {
            this.removeSelected(item);
        }
        if (this._settings.singleSelection && this._settings.closeDropDownOnSelection) {
            this.closeDropdown();
        }
    }

    onBlurSelection() {
        if (this.disabled) {
            return false;
        }
        if (this.select !== null && typeof (this.select) !== 'undefined' && this.select !== '') {
            const SelectedValues = this.select.split(',');
            let distinctValues = [];
            try {
                distinctValues = SelectedValues.filter((value, index, self) =>
                    self.indexOf(value) === index
                );
            } catch (e) {
                console.log('Error =>', e);
            }

            for (let i = 0; i < distinctValues.length; i++) {
                if (!this.isSelectedByText(distinctValues[i])) {
                    for (let j = 0; j < this._data.length; j++) {
                        if (distinctValues[i].toLowerCase() === this._data[j].text.toLowerCase()) {
                            const limit = this.selectedItems.length < this._settings.limitSelection ? true : false;
                            if (this._settings.limitSelection) {
                                if (limit) {
                                    this.addSelected(this._data[j]);
                                }
                            } else {
                                this.addSelected(this._data[j]);
                            }
                        }
                    }
                }
            }

            this.select = '';
        }

    }

    writeValue(value: any) {
        if (value !== undefined && value !== null) {
            if (this._settings.singleSelection) {
                try {
                    if (value.length >= 1) {
                        const firstItem = value[0];
                        this.selectedItems = [
                            typeof firstItem === 'string'
                                ? new ListItem(firstItem)
                                : new ListItem({
                                    id: firstItem[this._settings.idField],
                                    text: firstItem[this._settings.textField]
                                })
                        ];
                    }
                } catch (e) {
                    // console.error(e.body.msg);
                }
            } else {
                const _data = value.map(
                    (item: any) =>
                        typeof item === 'string'
                            ? new ListItem(item)
                            : new ListItem({
                                id: item[this._settings.idField],
                                text: item[this._settings.textField]
                            })
                );
                if (this._settings.limitSelection) {
                    this.selectedItems = _data.splice(0, this._settings.limitSelection);
                } else {
                    this.selectedItems = _data;
                }
            }
        }
    }

    // From ControlValueAccessor interface
    registerOnChange(fn: any) {
        this.onChangeCallback = fn;
    }

    // From ControlValueAccessor interface
    registerOnTouched(fn: any) {
        this.onTouchedCallback = fn;
    }

    // Set touched on blur
    @HostListener('blur')
    public onTouched() {
        this.closeDropdown();
        this.onTouchedCallback();
    }

    trackByFn(index, item) {
        return item.id;
    }

    isSelected(clickedItem: ListItem) {
        let found = false;
        this.selectedItems.forEach(item => {
            if (clickedItem.id === item.id) {
                found = true;
            }
        });
        return found;
    }

    isSelectedByText(itemText: String) {
        let found = false;
        this.selectedItems.forEach(item => {
            if (itemText === item.text) {
                found = true;
            }
        });
        return found;
    }

    isLimitSelectionReached(): boolean {
        return this._settings.limitSelection === this.selectedItems.length;
    }

    isAllItemsSelected(): boolean {
        return this._data.length === this.selectedItems.length;
    }

    itemShowRemaining(): Number {
        return this.selectedItems.length - Number(this._settings.itemsShowLimit);
    }

    addSelected(item: ListItem) {
        if (this._settings.singleSelection) {
            this.selectedItems = [];
            this.selectedItems.push(item);
        } else {
            this.selectedItems.push(item);
        }
        this.onChangeCallback(this.emittedValue(this.selectedItems));
        this.onSelect.emit(this.emittedValue(item));
    }

    removeSelected(item: ListItem) {
        this.selectedItems.forEach(itm => {
            if (item.id === itm.id) {
                this.selectedItems.splice(this.selectedItems.indexOf(item), 1);
            }
        });
        this.onChangeCallback(this.emittedValue(this.selectedItems));
        this.onDeSelect.emit(this.emittedValue(item));
    }

    emittedValue(val: any): any {
        const selected = [];
        if (Array.isArray(val)) {
            val.map(item => {
                if (item.id === item.text) {
                    selected.push(item.text);
                } else {
                    selected.push(this.objectify(item));
                }
            });
        } else {
            if (val) {
                if (val.id === val.text) {
                    return val.text;
                } else {
                    return this.objectify(val);
                }
            }
        }
        return selected;
    }

    objectify(val: ListItem) {
        const obj = {};
        obj[this._settings.idField] = val.id;
        obj[this._settings.textField] = val.text;
        return obj;
    }

    toggleDropdown(evt) {
        evt.preventDefault();
        if (this.disabled && this._settings.singleSelection) {
            return;
        }
        this.isDropdownOpen = !this.isDropdownOpen;
    }

    closeDropdown() {
        this.isDropdownOpen = false;
    }

    toggleSelectAll() {
        if (this.disabled) {
            return false;
        }
        if (!this.isAllItemsSelected()) {
            this.selectedItems = this._data.slice();
        } else {
            this.selectedItems = [];
        }
        this.onChangeCallback(this.emittedValue(this.selectedItems));
        this.onDeSelectAll.emit(this.emittedValue(this.selectedItems));
    }
}
