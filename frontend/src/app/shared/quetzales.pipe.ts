import { Pipe, PipeTransform } from '@angular/core';

/** Formatea un número como moneda guatemalteca:  1234.5 -> "Q1,234.50" */
@Pipe({ name: 'quetzales' })
export class QuetzalesPipe implements PipeTransform {
  transform(valor: number | string | null | undefined): string {
    const n = Number(valor ?? 0);
    return 'Q' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
