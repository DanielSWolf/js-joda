/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import {requireNonNull} from './assert';
import {DateTimeException} from './errors';
import {MathUtil} from './MathUtil';

import {LocalTime} from './LocalTime';
import {ZoneId} from './ZoneId';

import {ChronoField} from './temporal/ChronoField';
import {TemporalQueries} from './temporal/TemporalQueries';

import {ZoneRules} from './zone/ZoneRules';

var SECONDS_CACHE = {};
var ID_CACHE = {};

/**
 *
 * <h3>Static properties of Class {@link LocalDate}</h3>
 *
 * ZoneOffset.MAX_SECONDS = 18 * LocalTime.SECONDS_PER_HOUR;
 *
 * ZoneOffset.UTC = ZoneOffset.ofTotalSeconds(0);
 *
 * ZoneOffset.MIN = ZoneOffset.ofTotalSeconds(-ZoneOffset.MAX_SECONDS);
 *
 * ZoneOffset.MAX = ZoneOffset.ofTotalSeconds(ZoneOffset.MAX_SECONDS);
 *
 */
export class ZoneOffset extends ZoneId {
    /**
     * 
     * @param {number} totalSeconds
     */
    constructor(totalSeconds){
        super();
        ZoneOffset._validateTotalSeconds(totalSeconds);
        this._totalSeconds = totalSeconds;
        this._rules = ZoneRules.of(this);
        this._id = ZoneOffset._buildId(totalSeconds);
    }

    /**
     * 
     * @returns {number}
     */
    totalSeconds() {
        return this._totalSeconds;
    }

    /**
     *
     * @returns {string}
     */
    id() {
        return this._id;
    }

    /**
     *
     * @param {number} totalSeconds
     * @returns {string}
     */
    static _buildId(totalSeconds) {
        if (totalSeconds === 0) {
            return 'Z';
        } else {
            var absTotalSeconds = Math.abs(totalSeconds);
            var absHours = MathUtil.intDiv(absTotalSeconds, LocalTime.SECONDS_PER_HOUR);
            var absMinutes = MathUtil.intMod(MathUtil.intDiv(absTotalSeconds, LocalTime.SECONDS_PER_MINUTE), LocalTime.MINUTES_PER_HOUR);
            var buf = '' + (totalSeconds < 0 ? '-' : '+')
                + (absHours < 10 ? '0' : '') + (absHours)
                + (absMinutes < 10 ? ':0' : ':') + (absMinutes);
            var absSeconds = MathUtil.intMod(absTotalSeconds, LocalTime.SECONDS_PER_MINUTE);
            if (absSeconds !== 0) {
                buf += (absSeconds < 10 ? ':0' : ':') + (absSeconds);
            }
            return buf;
        }
    }


    /**
     * 
     * @param {number} totalSeconds
     * @private
     */
    static _validateTotalSeconds(totalSeconds){
        if (Math.abs(totalSeconds) > ZoneOffset.MAX_SECONDS) {
            throw new DateTimeException('Zone offset not in valid range: -18:00 to +18:00');
        }
    }

    /**
     * 
     * @param {number} hours
     * @param {number} minutes
     * @param {number} seconds
     * @private
     */
    static _validate(hours, minutes, seconds) {
        if (hours < -18 || hours > 18) {
            throw new DateTimeException('Zone offset hours not in valid range: value ' + hours +
                    ' is not in the range -18 to 18');
        }
        if (hours > 0) {
            if (minutes < 0 || seconds < 0) {
                throw new DateTimeException('Zone offset minutes and seconds must be positive because hours is positive');
            }
        } else if (hours < 0) {
            if (minutes > 0 || seconds > 0) {
                throw new DateTimeException('Zone offset minutes and seconds must be negative because hours is negative');
            }
        } else if ((minutes > 0 && seconds < 0) || (minutes < 0 && seconds > 0)) {
            throw new DateTimeException('Zone offset minutes and seconds must have the same sign');
        }
        if (Math.abs(minutes) > 59) {
            throw new DateTimeException('Zone offset minutes not in valid range: abs(value) ' +
                    Math.abs(minutes) + ' is not in the range 0 to 59');
        }
        if (Math.abs(seconds) > 59) {
            throw new DateTimeException('Zone offset seconds not in valid range: abs(value) ' +
                    Math.abs(seconds) + ' is not in the range 0 to 59');
        }
        if (Math.abs(hours) === 18 && (Math.abs(minutes) > 0 || Math.abs(seconds) > 0)) {
            throw new DateTimeException('Zone offset not in valid range: -18:00 to +18:00');
        }
    }

    //-----------------------------------------------------------------------
    /**
     * Obtains an instance of {@code ZoneOffset} using the ID.
     * <p>
     * This method parses the string ID of a {@code ZoneOffset} to
     * return an instance. The parsing accepts all the formats generated by
     * {@link #getId()}, plus some additional formats:
     * <p><ul>
     * <li>{@code Z} - for UTC
     * <li>{@code +h}
     * <li>{@code +hh}
     * <li>{@code +hh:mm}
     * <li>{@code -hh:mm}
     * <li>{@code +hhmm}
     * <li>{@code -hhmm}
     * <li>{@code +hh:mm:ss}
     * <li>{@code -hh:mm:ss}
     * <li>{@code +hhmmss}
     * <li>{@code -hhmmss}
     * </ul><p>
     * Note that &plusmn; means either the plus or minus symbol.
     * <p>
     * The ID of the returned offset will be normalized to one of the formats
     * described by {@link #getId()}.
     * <p>
     * The maximum supported range is from +18:00 to -18:00 inclusive.
     *
     * @param {string} offsetId  the offset ID, not null
     * @return {ZoneOffset} the zone-offset, not null
     * @throws DateTimeException if the offset ID is invalid
     */
    static of(offsetId) {
        requireNonNull(offsetId, 'offsetId');
        // "Z" is always in the cache
        var offset = ID_CACHE[offsetId];
        if (offset != null) {
            return offset;
        }

        // parse - +h, +hh, +hhmm, +hh:mm, +hhmmss, +hh:mm:ss
        var hours, minutes, seconds;
        switch (offsetId.length) {
            case 2:
                offsetId = offsetId[0] + '0' + offsetId[1];  // fallthru
            // eslint-disable-next-line no-fallthrough
            case 3:
                hours = ZoneOffset._parseNumber(offsetId, 1, false);
                minutes = 0;
                seconds = 0;
                break;
            case 5:
                hours = ZoneOffset._parseNumber(offsetId, 1, false);
                minutes = ZoneOffset._parseNumber(offsetId, 3, false);
                seconds = 0;
                break;
            case 6:
                hours = ZoneOffset._parseNumber(offsetId, 1, false);
                minutes = ZoneOffset._parseNumber(offsetId, 4, true);
                seconds = 0;
                break;
            case 7:
                hours = ZoneOffset._parseNumber(offsetId, 1, false);
                minutes = ZoneOffset._parseNumber(offsetId, 3, false);
                seconds = ZoneOffset._parseNumber(offsetId, 5, false);
                break;
            case 9:
                hours = ZoneOffset._parseNumber(offsetId, 1, false);
                minutes = ZoneOffset._parseNumber(offsetId, 4, true);
                seconds = ZoneOffset._parseNumber(offsetId, 7, true);
                break;
            default:
                throw new DateTimeException('Invalid ID for ZoneOffset, invalid format: ' + offsetId);
        }
        var first = offsetId[0];
        if (first !== '+' && first !== '-') {
            throw new DateTimeException('Invalid ID for ZoneOffset, plus/minus not found when expected: ' + offsetId);
        }
        if (first === '-') {
            return ZoneOffset.ofHoursMinutesSeconds(-hours, -minutes, -seconds);
        } else {
            return ZoneOffset.ofHoursMinutesSeconds(hours, minutes, seconds);
        }
    }

    /**
     * Parse a two digit zero-prefixed number.
     *
     * @param {string} offsetId - the offset ID, not null
     * @param {number} pos - the position to parse, valid
     * @param {boolean} precededByColon - should this number be prefixed by a precededByColon
     * @return {number} the parsed number, from 0 to 99
     */
    static _parseNumber(offsetId, pos, precededByColon) {
        if (precededByColon && offsetId[pos - 1] !== ':') {
            throw new DateTimeException('Invalid ID for ZoneOffset, colon not found when expected: ' + offsetId);
        }
        var ch1 = offsetId[pos];
        var ch2 = offsetId[pos + 1];
        if (ch1 < '0' || ch1 > '9' || ch2 < '0' || ch2 > '9') {
            throw new DateTimeException('Invalid ID for ZoneOffset, non numeric characters found: ' + offsetId);
        }
        return (ch1.charCodeAt(0) - 48) * 10 + (ch2.charCodeAt(0) - 48);
    }

    /**
     * 
     * @param {number} hours
     * @returns {ZoneOffset}
     */
    static ofHours(hours) {
        return ZoneOffset.ofHoursMinutesSeconds(hours, 0, 0);
    }

    /**
     * 
     * @param {number} hours
     * @param {number} minutes
     * @returns {ZoneOffset}
     */
    static ofHoursMinutes(hours, minutes) {
        return ZoneOffset.ofHoursMinutesSeconds(hours, minutes, 0);
    }

    /**
     * 
     * @param {number} hours
     * @param {number} minutes
     * @param {number} seconds
     * @returns {ZoneOffset}
     */
    static ofHoursMinutesSeconds(hours, minutes, seconds) {
        ZoneOffset._validate(hours, minutes, seconds);
        var totalSeconds = hours * LocalTime.SECONDS_PER_HOUR + minutes * LocalTime.SECONDS_PER_MINUTE + seconds;
        return ZoneOffset.ofTotalSeconds(totalSeconds);
    }

    /**
     * 
     * @param {number} totalMinutes
     * @returns {ZoneOffset}
     */
    static ofTotalMinutes(totalMinutes) {
        var totalSeconds = totalMinutes * LocalTime.SECONDS_PER_MINUTE;
        return ZoneOffset.ofTotalSeconds(totalSeconds);
    }

    /**
     * 
     * @param {number} totalSeconds
     * @returns {ZoneOffset}
     */
    static ofTotalSeconds(totalSeconds) {
        if (totalSeconds % (15 * LocalTime.SECONDS_PER_MINUTE) === 0) {
            var totalSecs = totalSeconds;
            var result = SECONDS_CACHE[totalSecs];
            if (result == null) {
                result = new ZoneOffset(totalSeconds);
                SECONDS_CACHE[totalSecs] = result;
                ID_CACHE[result.id()] = result;
            }
            return result;
        } else {
            return new ZoneOffset(totalSeconds);
        }
    }

    /**
     * Gets the associated time-zone rules.
     * <p>
     * The rules will always return this offset when queried.
     * The implementation class is immutable, thread-safe and serializable.
     *
     * @return {ZoneRules} the rules, not null
     */
    rules() {
        return this._rules;
    }

    /**
      * Gets the value of the specified field from this offset as an {@code int}.
      * <p>
      * This queries this offset for the value for the specified field.
      * The returned value will always be within the valid range of values for the field.
      * If it is not possible to return the value, because the field is not supported
      * or for some other reason, an exception is thrown.
      * <p>
      * If the field is a {@link ChronoField} then the query is implemented here.
      * The {@code OFFSET_SECONDS} field returns the value of the offset.
      * All other {@code ChronoField} instances will throw a {@code DateTimeException}.
      * <p>
      * If the field is not a {@code ChronoField}, then the result of this method
      * is obtained by invoking {@code TemporalField.getFrom(TemporalAccessor)}
      * passing {@code this} as the argument. Whether the value can be obtained,
      * and what the value represents, is determined by the field.
      *
      * @param {TemporalField} field - the field to get, not null
      * @return {number} the value for the field
      * @throws DateTimeException if a value for the field cannot be obtained
      * @throws ArithmeticException if numeric overflow occurs
      */
    get(field) {
        return this.getLong(field);
    }

     /**
      * Gets the value of the specified field from this offset as a {@code long}.
      * <p>
      * This queries this offset for the value for the specified field.
      * If it is not possible to return the value, because the field is not supported
      * or for some other reason, an exception is thrown.
      * <p>
      * If the field is a {@link ChronoField} then the query is implemented here.
      * The {@code OFFSET_SECONDS} field returns the value of the offset.
      * All other {@code ChronoField} instances will throw a {@code DateTimeException}.
      * <p>
      * If the field is not a {@code ChronoField}, then the result of this method
      * is obtained by invoking {@code TemporalField.getFrom(TemporalAccessor)}
      * passing {@code this} as the argument. Whether the value can be obtained,
      * and what the value represents, is determined by the field.
      *
      * @param {TemporalField} field - the field to get, not null
      * @return {number} the value for the field
      * @throws DateTimeException if a value for the field cannot be obtained
      * @throws ArithmeticException if numeric overflow occurs
      */
    getLong(field) {
        if (field === ChronoField.OFFSET_SECONDS) {
            return this._totalSeconds;
        } else if (field instanceof ChronoField) {
            throw new DateTimeException('Unsupported field: ' + field);
        }
        return field.getFrom(this);
    }

     //-----------------------------------------------------------------------
     /**
      * Queries this offset using the specified query.
      * <p>
      * This queries this offset using the specified query strategy object.
      * The {@code TemporalQuery} object defines the logic to be used to
      * obtain the result. Read the documentation of the query to understand
      * what the result of this method will be.
      * <p>
      * The result of this method is obtained by invoking the
      * {@link TemporalQuery#queryFrom(TemporalAccessor)} method on the
      * specified query passing {@code this} as the argument.
      *
      * @param {TemporalQuery} query - the query to invoke, not null
      * @return {*} the query result, null may be returned (defined by the query)
      * @throws DateTimeException if unable to query (defined by the query)
      * @throws ArithmeticException if numeric overflow occurs (defined by the query)
      */
    query(query) {
        requireNonNull(query, 'query');
        if (query === TemporalQueries.offset() || query === TemporalQueries.zone()) {
            return this;
        } else if (query === TemporalQueries.localDate() || query === TemporalQueries.localTime() ||
                 query === TemporalQueries.precision() || query === TemporalQueries.chronology() || query === TemporalQueries.zoneId()) {
            return null;
        }
        return query.queryFrom(this);
    }

     /**
      * Adjusts the specified temporal object to have the same offset as this object.
      * <p>
      * This returns a temporal object of the same observable type as the input
      * with the offset changed to be the same as this.
      * <p>
      * The adjustment is equivalent to using {@link Temporal#with(TemporalField, long)}
      * passing {@link ChronoField#OFFSET_SECONDS} as the field.
      * <p>
      * In most cases, it is clearer to reverse the calling pattern by using
      * {@link Temporal#with(TemporalAdjuster)}:
      * <pre>
      *   // these two lines are equivalent, but the second approach is recommended
      *   temporal = thisOffset.adjustInto(temporal);
      *   temporal = temporal.with(thisOffset);
      * </pre>
      * <p>
      * This instance is immutable and unaffected by this method call.
      *
      * @param {Temporal} temporal - the target object to be adjusted, not null
      * @return {Temporal} the adjusted object, not null
      * @throws DateTimeException if unable to make the adjustment
      * @throws ArithmeticException if numeric overflow occurs
      */
    adjustInto(temporal) {
        return temporal.with(ChronoField.OFFSET_SECONDS, this._totalSeconds);
    }

    /**
     * Compares this offset to another offset in descending order.
     * <p>
     * The offsets are compared in the order that they occur for the same time
     * of day around the world. Thus, an offset of {@code +10:00} comes before an
     * offset of {@code +09:00} and so on down to {@code -18:00}.
     * <p>
     * The comparison is "consistent with equals", as defined by {@link Comparable}.
     *
     * @param {!ZoneOffset} other - the other date to compare to, not null
     * @return {number} the comparator value, negative if less, postive if greater
     * @throws NullPointerException if {@code other} is null
     */
    compareTo(other) {
        requireNonNull(other, 'other');
        return other._totalSeconds - this._totalSeconds;
    }


    /**
     * Checks if this offset is equal to another offset.
     *
     * The comparison is based on the amount of the offset in seconds.
     * This is equivalent to a comparison by ID.
     *
     * @param {*} obj - the object to check, null returns false
     * @return {boolean} true if this is equal to the other offset
     */
    equals(obj) {
        if (this === obj) {
            return true;
        }
        if (obj instanceof ZoneOffset) {
            return this._totalSeconds === obj._totalSeconds;
        }
        return false;
    }

    /**
     * @return {number}
     */
    hashCode(){
        return this._totalSeconds;
    }

    /**
     *
     * @returns {string}
     */
    toString(){
        return this._id;
    }
}

export function _init() {
    ZoneOffset.MAX_SECONDS = 18 * LocalTime.SECONDS_PER_HOUR;
    ZoneOffset.UTC = ZoneOffset.ofTotalSeconds(0);
    ZoneOffset.MIN = ZoneOffset.ofTotalSeconds(-ZoneOffset.MAX_SECONDS);
    ZoneOffset.MAX = ZoneOffset.ofTotalSeconds(ZoneOffset.MAX_SECONDS);
}